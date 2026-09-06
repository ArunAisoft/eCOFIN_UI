

import { MenuTitleService } from 'src/app/shared/services/menu-title.service';
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  profile: any;
  roleId: any;
  isDropdownOpen = false;
  openMenu: string = '';

  constructor(private router: Router, private menuTitleService: MenuTitleService) { }

  ngOnInit() {
    this.roleId = localStorage.getItem('roleId');

    this.setMenuFromRoute(this.router.url);

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setMenuFromRoute(event.url);
      }
    });

  }


  toggleMenu(menu: string) {
    this.openMenu = this.openMenu === menu ? '' : menu;
  }

  isOpen(menu: string): boolean {
    return this.openMenu === menu;
  }

  setMenuFromRoute(url: string) {
    if (url.includes('/voucher/bankreceipts')) {
      this.openMenu = 'voucher';
    } else if (url.includes('/reports/tdsreport')) {
      this.openMenu = 'ba';
    } else if (url.includes('/master/company')) {
      this.openMenu = 'master';
    } else if (url.includes('/voucher/salevoucher') || url.includes('/debitadjustment')) {
      this.openMenu = 'ar';
    } else if (url.includes('/voucher/purchasebill') || url.includes('/creditadjustment')) {
      this.openMenu = 'ap';
    }
  }

  setMenuTitle(title: string) {
    this.menuTitleService.setTitle(title);
  }

  logout() {
    localStorage.removeItem('user');
    localStorage.clear();
    this.router.navigate(['login'], { replaceUrl: true });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }
}
