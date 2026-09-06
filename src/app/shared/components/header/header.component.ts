import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuTitleService } from 'src/app/shared/services/menu-title.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  userName: string | null = null;
  mobileNavActive = false;
  menuTitle: string = 'Dashboard';
  private titleSub?: Subscription;

  constructor(
    private router: Router,
    private menuTitleService: MenuTitleService
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName');
    this.menuTitle = this.menuTitleService.currentValue;
    this.titleSub = this.menuTitleService.currentTitle.subscribe(title => {
      this.menuTitle = title || 'Dashboard';
    });
  }

  ngOnDestroy(): void {
    this.titleSub?.unsubscribe();
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  toggleMobileNav(): void {
    this.mobileNavActive = !this.mobileNavActive;
  }

  hidemobileNavActive(): void {
    this.mobileNavActive = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const clickedInside = (event.target as HTMLElement).closest('.navmenu');
    if (!clickedInside) {
      this.mobileNavActive = false;
    }
  }
}
