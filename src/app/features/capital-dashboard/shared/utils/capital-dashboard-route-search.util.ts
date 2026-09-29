import { inject, Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map } from 'rxjs';
import { WritableSignal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CapitalDashboardRouteSearchSync {
  private readonly route = inject(ActivatedRoute);

  bindTableSearch(tableSearch: WritableSignal<string>, resetPage: () => void): void {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('search')?.trim() ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((search) => {
        if (!search || search === tableSearch()) {
          return;
        }

        tableSearch.set(search);
        resetPage();
      });
  }
}
