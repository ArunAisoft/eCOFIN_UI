import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import {
  UserPermissionService,
  UserListDto,
  TaskDto,
  PanelDto,
  UserPermissionDto,
  SaveUserPermissionPayload
} from 'src/app/shared/services/master/userpermission.service';

@Component({
  selector: 'app-userpermissions',
  templateUrl: './userpermissions.component.html',
  styleUrls: ['./userpermissions.component.css']
})
export class UserPermissionsComponent implements OnInit {

  isLoading = false;
  isSaving = false;
  loggedInUser = '';
  isEditMode = false;
  editingCode = '';
  searchText = '';

  searchTaskText = '';
  searchPanelText = '';

  permForm!: FormGroup;

  userList: UserListDto[] = [];
  permissionList: any[] = [];
  taskList: TaskDto[] = [];
  panelList: PanelDto[] = [];

  selectedTaskIds = new Set<number>();
  selectedPanelIds = new Set<number>();

  activeTaskId: number | null = null;

  readonly accessLevels = [
    { value: 0, label: 'View' },
    { value: 1, label: 'User' },
    { value: 2, label: 'Super user' },
    { value: 3, label: 'Supervisor' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: UserPermissionService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.loggedInUser = u;
    this.buildForm();
    this.loadUsers();
    this.loadPermissionList();
  }

  buildForm(): void {
    this.permForm = this.fb.group({
      username: ['', Validators.required],
      accessLevel: [0, Validators.required]
    });
  }

  get filteredPermissionList(): any[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.permissionList;
    return this.permissionList.filter(r =>
      r.username?.toLowerCase().includes(q) ||
      r.nameDescription?.toLowerCase().includes(q) ||
      this.accessLevelLabel(r.levelNumber)?.toLowerCase().includes(q)
    );
  }

  get filteredTaskList(): TaskDto[] {
    const q = this.searchTaskText.trim().toLowerCase();
    return !q ? this.taskList : this.taskList.filter(t => t.taskFullName?.toLowerCase().includes(q));
  }

  get filteredPanelList(): PanelDto[] {
    const q = this.searchPanelText.trim().toLowerCase();
    return !q ? this.panelList : this.panelList.filter(p => p.panelFullName?.toLowerCase().includes(q));
  }

  get selectedTaskCount(): number { return this.selectedTaskIds.size; }
  get selectedPanelCount(): number { return this.selectedPanelIds.size; }

  isInvalid(ctrl: string): boolean {
    const c = this.permForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  accessLevelLabel(val: number): string {
    return this.accessLevels.find(x => x.value === val)?.label ?? '';
  }

  loadUsers(): void {
    this.svc.getAllUsers().subscribe({
      next: res => {
        this.userList = res?.data ?? [];
        this.cd.detectChanges();
      },
      error: () => this.alertService.error('Failed to load users.')
    });
  }

  loadPermissionList(): void {
    this.isLoading = true;
    this.svc.getAllPermissions()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: any) => {
          this.permissionList = Array.isArray(res?.data) ? res.data : [];
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load permission list.')
      });
  }

  onUserChange(): void {
    const username = this.permForm.get('username')?.value;

    this.taskList = [];
    this.panelList = [];
    this.selectedTaskIds.clear();
    this.selectedPanelIds.clear();
    this.activeTaskId = null;

    if (!username) return;

    this.loadTasks();
    this.loadExistingPermissions(username);
  }

  loadTasks(): void {
    this.isLoading = true;
    this.svc.getTasks()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: res => {
          this.taskList = res?.data ?? [];
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load tasks.')
      });
  }

  loadPanels(taskId: number): void {
    this.activeTaskId = taskId;
    this.isLoading = true;

    this.svc.getPanels(taskId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: res => {
          this.panelList = res?.data ?? [];
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load panels.')
      });
  }

  loadExistingPermissions(username: string): void {
    this.svc.getUserPermissions(username).subscribe({
      next: res => {
        const data: UserPermissionDto = res?.data ?? { taskIds: [], panelIds: [], levelNumber: 0 };
        this.selectedTaskIds = new Set(data.taskIds || []);
        this.selectedPanelIds = new Set(data.panelIds || []);
        this.permForm.patchValue({ accessLevel: data.levelNumber ?? 0 });
        this.cd.detectChanges();
      },
      error: () => { /* no permissions yet = blank */ }
    });
  }

  startEdit(row: any): void {
    this.isEditMode = true;
    this.editingCode = row.username;
    this.permForm.patchValue({
      username: row.username,
      accessLevel: row.levelNumber ?? 0
    });
    this.permForm.get('username')?.disable();
    this.taskList = [];
    this.panelList = [];
    this.selectedTaskIds.clear();
    this.selectedPanelIds.clear();
    this.activeTaskId = null;
    this.loadTasks();
    this.loadExistingPermissions(row.username);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleTask(taskId: number, checked: boolean): void {
    checked ? this.selectedTaskIds.add(taskId) : this.selectedTaskIds.delete(taskId);
  }

  togglePanel(panelId: number, checked: boolean): void {
    checked ? this.selectedPanelIds.add(panelId) : this.selectedPanelIds.delete(panelId);
  }

  isTaskSelected(taskId: number): boolean { return this.selectedTaskIds.has(taskId); }
  isPanelSelected(panelId: number): boolean { return this.selectedPanelIds.has(panelId); }

  selectAllTasks(): void { this.filteredTaskList.forEach(t => this.selectedTaskIds.add(t.taskId)); }
  unselectAllTasks(): void { this.filteredTaskList.forEach(t => this.selectedTaskIds.delete(t.taskId)); }
  selectAllPanels(): void { this.filteredPanelList.forEach(p => this.selectedPanelIds.add(p.panelId)); }
  unselectAllPanels(): void { this.filteredPanelList.forEach(p => this.selectedPanelIds.delete(p.panelId)); }

  onSave(): void {
    this.permForm.markAllAsTouched();

    if (this.permForm.invalid) {
      this.alertService.warning('Please select a user.');
      return;
    }

    if (this.selectedTaskIds.size === 0) {
      this.alertService.warning('Select at least one task.');
      return;
    }

    const username = this.isEditMode ? this.editingCode : this.permForm.get('username')?.value;

    const payload: SaveUserPermissionPayload = {
      username,
      levelNumber: Number(this.permForm.get('accessLevel')?.value),
      taskIds: Array.from(this.selectedTaskIds),
      panelIds: Array.from(this.selectedPanelIds)
    };

    this.isSaving = true;
    this.svc.savePermissions(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: res => {
          if (res?.success === false) {
            this.alertService.warning(res?.message || 'Failed to save.');
            return;
          }
          this.alertService.success(res?.message || (this.isEditMode ? 'Updated successfully.' : 'Saved successfully.'));
          this.onClear();
          this.loadPermissionList();
        },
        error: () => this.alertService.error(this.isEditMode ? 'Update failed.' : 'Save failed.')
      });
  }

  onClear(): void {
    this.isEditMode = false;
    this.editingCode = '';
    this.permForm.reset({ username: '', accessLevel: 0 });
    this.permForm.get('username')?.enable();
    this.permForm.markAsPristine();
    this.permForm.markAsUntouched();

    this.taskList = [];
    this.panelList = [];
    this.selectedTaskIds.clear();
    this.selectedPanelIds.clear();
    this.activeTaskId = null;
    this.searchTaskText = '';
    this.searchPanelText = '';

    this.cd.detectChanges();
  }
}