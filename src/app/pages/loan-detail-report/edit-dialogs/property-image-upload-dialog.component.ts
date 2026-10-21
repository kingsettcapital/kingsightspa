import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { CurrentAppUserService } from '../../../core/services/current-app-user.service';
import {
  PROPERTY_IMAGE_ACCEPT,
  PROPERTY_IMAGE_MAX_BYTES,
  PROPERTY_IMAGE_MIME_TYPES,
  PropertyImageApiService,
} from '../../../core/services/property-image-api.service';
import { extractApiError } from '../../../core/utils/api-error.util';

/** Upload / replace / remove the property photo for the report's loan alias. */
@Component({
  selector: 'app-property-image-upload-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  styleUrl: './report-edit-dialog.css',
  template: `
    <div class="ks-modal-backdrop" (click)="close()">
      <div class="ks-modal red-modal" role="dialog" aria-modal="true" aria-labelledby="piEditTitle" (click)="$event.stopPropagation()">
        <header class="ks-modal__header">
          <h2 class="ks-modal__title" id="piEditTitle">Property Image — {{ loanAliasName() }}</h2>
          <button type="button" class="ks-modal__close" (click)="close()" aria-label="Close">×</button>
        </header>
        <div class="ks-modal__body">
          <input #picker type="file" hidden [accept]="accept" (change)="onPick($event)" />
          @if (previewUrl() || currentImageUrl(); as src) {
            <div class="red-viewer-tools">
              <button type="button" class="red-zoom-btn" (click)="zoomOut()" [disabled]="zoom() <= minZoom" aria-label="Zoom out" title="Zoom out">
                <mat-icon aria-hidden="true">zoom_out</mat-icon>
              </button>
              <button type="button" class="red-zoom-btn red-zoom-btn--label" (click)="resetZoom()" title="Reset to fit">
                {{ zoomLabel() }}
              </button>
              <button type="button" class="red-zoom-btn" (click)="zoomIn()" [disabled]="zoom() >= maxZoom" aria-label="Zoom in" title="Zoom in">
                <mat-icon aria-hidden="true">zoom_in</mat-icon>
              </button>
              <span class="red-viewer-tools__spacer"></span>
              <button type="button" class="ks-btn ks-btn--outline red-viewer-tools__choose" (click)="picker.click()" [disabled]="isSaving()">
                Choose Another Image
              </button>
            </div>
            <div
              #viewer
              class="red-viewer"
              [class.red-viewer--zoomed]="zoom() > 1"
              [class.red-viewer--panning]="isPanning()"
              [class.red-drop--over]="isDragOver()"
              (wheel)="onWheel($event)"
              (mousedown)="startPan($event)"
              (mousemove)="pan($event)"
              (mouseup)="endPan()"
              (mouseleave)="endPan()"
              (dragover)="onDragOver($event)"
              (dragleave)="isDragOver.set(false)"
              (drop)="onDrop($event)"
            >
              <img
                #previewImage
                class="red-viewer__image"
                draggable="false"
                [src]="previewUrl() || src"
                alt="Property image preview"
                [style.width.px]="imageWidth()"
                [style.visibility]="imageWidth() == null ? 'hidden' : null"
                (load)="onImageLoad($event)"
              />
            </div>
          } @else {
            <div
              class="red-drop"
              [class.red-drop--over]="isDragOver()"
              role="button"
              tabindex="0"
              (click)="picker.click()"
              (keydown.enter)="picker.click()"
              (dragover)="onDragOver($event)"
              (dragleave)="isDragOver.set(false)"
              (drop)="onDrop($event)"
            >
              <mat-icon aria-hidden="true">add_a_photo</mat-icon>
              <span>Drag an image here or click to browse</span>
            </div>
          }
          <p class="red-muted">
            @if (file(); as f) {
              Selected: {{ f.name }}
            } @else {
              JPG, PNG or WEBP · max 10 MB{{ currentImageUrl() ? ' · uploading replaces the current image' : '' }}
            }
            @if (previewUrl() || currentImageUrl()) {
              · Ctrl + scroll to zoom, drag to move · the visible area is what shows on the report
            }
          </p>
          @if (error()) {
            <p class="red-error">{{ error() }}</p>
          }
        </div>
        <footer class="ks-modal__footer">
          @if (currentImageUrl() && !file()) {
            <button type="button" class="ks-btn ks-btn--outline" (click)="remove()" [disabled]="isSaving()">
              Remove Image
            </button>
          }
          <button type="button" class="ks-btn ks-btn--accent" (click)="close()" [disabled]="isSaving()">Cancel</button>
          <button type="button" class="ks-btn ks-btn--accent" (click)="upload()" [disabled]="isSaving() || !canSave()">
            {{ isSaving() ? 'Saving…' : file() ? 'Upload and Close' : 'Save and Close' }}
          </button>
        </footer>
      </div>
    </div>
  `,
})
export class PropertyImageUploadDialogComponent implements OnDestroy {
  private readonly propertyImageApi = inject(PropertyImageApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);

  readonly loanAliasKey = input.required<number>();
  readonly loanAliasName = input.required<string>();
  /** Object URL of the image currently shown on the report (null when none). */
  readonly currentImageUrl = input<string | null>(null);
  readonly saved = output<string>();
  readonly closed = output<void>();

  readonly accept = PROPERTY_IMAGE_ACCEPT;
  readonly file = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly isDragOver = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal('');

  readonly minZoom = 0.5;
  readonly maxZoom = 4;
  /** 1 = image fitted inside the viewer; same step/range as the LTV QR slide preview. */
  readonly zoom = signal(1);
  readonly zoomLabel = computed(() => `${Math.round(this.zoom() * 100)}%`);
  private readonly viewer = viewChild<ElementRef<HTMLElement>>('viewer');
  private readonly previewImage = viewChild<ElementRef<HTMLImageElement>>('previewImage');
  private readonly fitWidth = signal<number | null>(null);
  readonly isPanning = signal(false);
  private panStart: { x: number; y: number; left: number; top: number } | null = null;
  /** A new file, or a zoomed-in view of the current image, can be saved. */
  readonly canSave = computed(() => !!this.file() || (!!this.currentImageUrl() && this.zoom() > 1));
  readonly imageWidth = computed(() => {
    const fit = this.fitWidth();
    return fit == null ? null : Math.round(fit * this.zoom());
  });

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    const box = this.viewer()?.nativeElement;
    if (!box || !img.naturalWidth || !img.naturalHeight) {
      return;
    }
    // Largest size that fits the viewer without upscaling small images.
    const scale = Math.min(
      (box.clientWidth - 2) / img.naturalWidth,
      (box.clientHeight - 2) / img.naturalHeight,
      1,
    );
    this.fitWidth.set(img.naturalWidth * scale);
  }

  zoomIn(): void {
    this.zoom.update((zoom) => Math.min(Math.round((zoom + 0.25) * 100) / 100, this.maxZoom));
  }

  zoomOut(): void {
    this.zoom.update((zoom) => Math.max(Math.round((zoom - 0.25) * 100) / 100, this.minZoom));
  }

  resetZoom(): void {
    this.zoom.set(1);
  }

  onWheel(event: WheelEvent): void {
    if (!event.ctrlKey) {
      return;
    }
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  startPan(event: MouseEvent): void {
    const box = this.viewer()?.nativeElement;
    if (!box || this.zoom() <= 1 || event.button !== 0) {
      return;
    }
    event.preventDefault();
    this.panStart = { x: event.clientX, y: event.clientY, left: box.scrollLeft, top: box.scrollTop };
    this.isPanning.set(true);
  }

  pan(event: MouseEvent): void {
    const box = this.viewer()?.nativeElement;
    if (!box || !this.panStart) {
      return;
    }
    box.scrollLeft = this.panStart.left - (event.clientX - this.panStart.x);
    box.scrollTop = this.panStart.top - (event.clientY - this.panStart.y);
  }

  endPan(): void {
    this.panStart = null;
    this.isPanning.set(false);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    this.selectFile(event.dataTransfer?.files?.[0]);
  }

  onPick(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.selectFile(inputEl.files?.[0]);
    inputEl.value = '';
  }

  async upload(): Promise<void> {
    if (!this.canSave() || this.isSaving()) {
      return;
    }
    const updatedBy = this.currentAppUser.getUpdatedBy();
    if (!updatedBy) {
      this.error.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    this.isSaving.set(true);
    this.error.set('');
    let cropped: File | null;
    try {
      cropped = await this.cropToVisibleArea();
    } catch {
      this.isSaving.set(false);
      this.error.set('Unable to prepare the image. Try a different file.');
      return;
    }
    const file = cropped ?? this.file();
    if (!file) {
      // Current image fully visible: nothing changed.
      this.isSaving.set(false);
      this.closed.emit();
      return;
    }
    if (file.size > PROPERTY_IMAGE_MAX_BYTES) {
      this.isSaving.set(false);
      this.error.set('Image is too large. Maximum upload size is 10 MB.');
      return;
    }

    this.propertyImageApi.upload(this.loanAliasKey(), file, updatedBy).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.emit('Property image uploaded.');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(
          err?.status === 413
            ? 'Image is too large. Maximum upload size is 10 MB.'
            : extractApiError(err, 'Unable to upload property image.'),
        );
      },
    });
  }

  remove(): void {
    if (this.isSaving()) {
      return;
    }
    const updatedBy = this.currentAppUser.getUpdatedBy();
    if (!updatedBy) {
      this.error.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    this.isSaving.set(true);
    this.error.set('');
    this.propertyImageApi.remove(this.loanAliasKey(), updatedBy).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.emit('Property image removed.');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.error.set(extractApiError(err, 'Unable to remove property image.'));
      },
    });
  }

  close(): void {
    if (!this.isSaving()) {
      this.closed.emit();
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  private selectFile(file: File | undefined): void {
    this.error.set('');
    if (!file) {
      return;
    }
    if (!PROPERTY_IMAGE_MIME_TYPES.includes(file.type)) {
      this.error.set('Only JPG, PNG or WEBP images are allowed.');
      return;
    }
    if (file.size > PROPERTY_IMAGE_MAX_BYTES) {
      this.error.set('Image is too large. Maximum upload size is 10 MB.');
      return;
    }
    this.revokePreview();
    this.zoom.set(1);
    this.fitWidth.set(null);
    this.file.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  /**
   * The part of the image visible in the viewer, at the original resolution.
   * Returns null when the whole image is visible (nothing to crop).
   */
  private async cropToVisibleArea(): Promise<File | null> {
    const box = this.viewer()?.nativeElement;
    const img = this.previewImage()?.nativeElement;
    if (!box || !img?.naturalWidth || !img.naturalHeight) {
      return null;
    }

    const boxRect = box.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const left = Math.max(boxRect.left + box.clientLeft, imgRect.left);
    const top = Math.max(boxRect.top + box.clientTop, imgRect.top);
    const right = Math.min(boxRect.left + box.clientLeft + box.clientWidth, imgRect.right);
    const bottom = Math.min(boxRect.top + box.clientTop + box.clientHeight, imgRect.bottom);
    if (right - left >= imgRect.width - 1 && bottom - top >= imgRect.height - 1) {
      return null;
    }

    const scale = img.naturalWidth / imgRect.width;
    const sx = Math.round((left - imgRect.left) * scale);
    const sy = Math.round((top - imgRect.top) * scale);
    const sw = Math.max(1, Math.round((right - left) * scale));
    const sh = Math.max(1, Math.round((bottom - top) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext('2d')?.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const source = this.file();
    const type = source && PROPERTY_IMAGE_MIME_TYPES.includes(source.type) ? source.type : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    if (!blob) {
      return null;
    }
    const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const baseName = source?.name.replace(/\.[^.]+$/, '') ?? 'property-image';
    return new File([blob], `${baseName}-cropped.${extension}`, { type });
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
  }
}
