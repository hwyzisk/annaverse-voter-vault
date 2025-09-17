import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Download, Users as UsersIcon, Plus, Edit, Trash2, Check, X } from "lucide-react";
import type { User } from "@shared/schema";

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  isFullPage?: boolean;
}

export default function AdminDashboard({ isOpen, onClose, user, isFullPage = false }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("users");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({ email: "", firstName: "", lastName: "", role: "viewer" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<{totalContacts: number, activeUsers: number, editsToday: number, dataQuality: number}>({
    queryKey: ['/api/admin/stats'],
    enabled: isOpen && user.role === 'admin',
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: isOpen && user.role === 'admin',
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/audit-logs'],
    enabled: isOpen && user.role === 'admin' && activeTab === 'audit',
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      return await apiRequest('POST', '/api/admin/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setShowAddUser(false);
      setNewUserData({ email: "", firstName: "", lastName: "", role: "viewer" });
      toast({ title: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create user",
        variant: "destructive" 
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
      toast({ title: "User role updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update user role",
        variant: "destructive" 
      });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "User status updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update user status",
        variant: "destructive" 
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete user",
        variant: "destructive" 
      });
    },
  });

  const handleExcelUpload = async () => {
    if (!excelFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('excel', excelFile);

      const response = await fetch('/api/admin/seed-excel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      toast({
        title: "Excel Import Complete",
        description: `Processed ${result.processed} contacts. ${result.errors.length} errors.`,
      });
      
      setExcelFile(null);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to process Excel file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!isFullPage && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                data-testid="button-close-admin"
              >
                <i className="fas fa-arrow-left"></i>
              </Button>
            )}
            <h2 className="text-xl font-bold">Admin Dashboard</h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              System Status: <Badge variant="secondary" className="bg-green-100 text-green-800">Operational</Badge>
            </span>
            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-export-data"
            >
              <i className="fas fa-download mr-2"></i>Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
            {/* System Stats Cards */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <i className="fas fa-users text-primary"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-contacts">
                      {statsLoading ? '-' : stats?.totalContacts?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <i className="fas fa-user-check text-green-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold" data-testid="stat-active-users">
                      {statsLoading ? '-' : stats?.activeUsers || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <i className="fas fa-edit text-blue-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Edits Today</p>
                    <p className="text-2xl font-bold" data-testid="stat-edits-today">
                      {statsLoading ? '-' : stats?.editsToday || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <i className="fas fa-chart-line text-purple-600"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Data Quality</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="stat-data-quality">
                      {statsLoading ? '-' : `${stats?.dataQuality || '0'}%`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-audit">Audit Logs</TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
              <TabsTrigger value="data" data-testid="tab-data">Data Management</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <UsersIcon className="w-5 h-5" />
                      User Management
                    </CardTitle>
                    <Button onClick={() => setShowAddUser(true)} data-testid="button-add-user">
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading users...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users?.map((userItem) => (
                            <TableRow key={userItem.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium" data-testid={`user-name-${userItem.id}`}>
                                    {userItem.firstName || userItem.lastName 
                                      ? `${userItem.firstName || ''} ${userItem.lastName || ''}`.trim()
                                      : 'No name set'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`user-email-${userItem.id}`}>
                                {userItem.email}
                              </TableCell>
                              <TableCell>
                                {editingUser?.id === userItem.id ? (
                                  <div className="flex items-center gap-2">
                                    <Select 
                                      value={editingUser.role}
                                      onValueChange={(role) => setEditingUser({...editingUser, role: role as any})}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => updateUserRoleMutation.mutate({
                                        userId: userItem.id,
                                        role: editingUser.role
                                      })}
                                      disabled={updateUserRoleMutation.isPending}
                                      data-testid={`button-save-role-${userItem.id}`}
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => setEditingUser(null)}
                                      data-testid={`button-cancel-edit-${userItem.id}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Badge 
                                    variant={userItem.role === 'admin' ? 'default' : userItem.role === 'editor' ? 'secondary' : 'outline'}
                                    data-testid={`user-role-${userItem.id}`}
                                  >
                                    {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={userItem.isActive ? 'default' : 'secondary'}
                                    className={userItem.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                                    data-testid={`user-status-${userItem.id}`}
                                  >
                                    {userItem.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateUserStatusMutation.mutate({
                                      userId: userItem.id,
                                      isActive: !userItem.isActive
                                    })}
                                    disabled={updateUserStatusMutation.isPending || userItem.id === user.id}
                                    data-testid={`button-toggle-status-${userItem.id}`}
                                  >
                                    {userItem.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`user-last-login-${userItem.id}`}>
                                {userItem.lastLoginAt 
                                  ? new Date(userItem.lastLoginAt).toLocaleDateString()
                                  : 'Never'
                                }
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingUser(userItem)}
                                    disabled={editingUser?.id === userItem.id}
                                    data-testid={`button-edit-user-${userItem.id}`}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  {userItem.id !== user.id && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-destructive hover:text-destructive"
                                          data-testid={`button-delete-user-${userItem.id}`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this user? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteUserMutation.mutate(userItem.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add User Dialog */}
              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogContent className="sm:max-w-md">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold">Add New User</h3>
                      <p className="text-sm text-muted-foreground">Create a new user account</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData(prev => ({...prev, email: e.target.value}))}
                          placeholder="user@example.com"
                          data-testid="input-new-user-email"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={newUserData.firstName}
                            onChange={(e) => setNewUserData(prev => ({...prev, firstName: e.target.value}))}
                            placeholder="John"
                            data-testid="input-new-user-first-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={newUserData.lastName}
                            onChange={(e) => setNewUserData(prev => ({...prev, lastName: e.target.value}))}
                            placeholder="Doe"
                            data-testid="input-new-user-last-name"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select 
                          value={newUserData.role}
                          onValueChange={(role) => setNewUserData(prev => ({...prev, role}))}
                        >
                          <SelectTrigger data-testid="select-new-user-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin - Full system access</SelectItem>
                            <SelectItem value="editor">Editor - Can edit contacts</SelectItem>
                            <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAddUser(false)}
                        data-testid="button-cancel-add-user"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createUserMutation.mutate(newUserData)}
                        disabled={!newUserData.email || createUserMutation.isPending}
                        data-testid="button-create-user"
                      >
                        {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Audit Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auditLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading audit logs...</p>
                    </div>
                  ) : auditLogs && auditLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Table</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Old Value</TableHead>
                            <TableHead>New Value</TableHead>
                            <TableHead>Contact</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell data-testid={`audit-timestamp-${log.id}`}>
                                <div className="text-sm">
                                  <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                                  <div className="text-muted-foreground">
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`audit-user-${log.id}`}>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium">
                                      {log.user?.firstName?.charAt(0) || log.user?.email?.charAt(0) || 'U'}
                                    </span>
                                  </div>
                                  <div className="text-sm">
                                    <div className="font-medium">
                                      {log.user?.firstName && log.user?.lastName 
                                        ? `${log.user.firstName} ${log.user.lastName}`
                                        : log.user?.firstName || log.user?.lastName || 'Unknown User'
                                      }
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                      {log.user?.email || 'No email'}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`audit-action-${log.id}`}>
                                <Badge 
                                  variant={
                                    log.action === 'create' ? 'default' : 
                                    log.action === 'update' ? 'secondary' : 
                                    log.action === 'delete' ? 'destructive' : 'outline'
                                  }
                                >
                                  {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell data-testid={`audit-table-${log.id}`}>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {log.tableName}
                                </code>
                              </TableCell>
                              <TableCell data-testid={`audit-field-${log.id}`}>
                                <span className="text-sm font-medium">
                                  {log.fieldName || '-'}
                                </span>
                              </TableCell>
                              <TableCell data-testid={`audit-old-value-${log.id}`}>
                                <div className="max-w-32 truncate text-sm">
                                  {log.oldValue ? (
                                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
                                      {log.oldValue}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell data-testid={`audit-new-value-${log.id}`}>
                                <div className="max-w-32 truncate text-sm">
                                  {log.newValue ? (
                                    <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs">
                                      {log.newValue}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell data-testid={`audit-contact-${log.id}`}>
                                {log.contact ? (
                                  <div className="text-sm">
                                    <div className="font-medium">{log.contact.fullName}</div>
                                    <div className="text-muted-foreground text-xs">
                                      {log.contact.systemId}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No audit logs found</p>
                      <p className="text-sm mt-2">Changes to contacts will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Field Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { field: 'Phone Numbers', key: 'phones' },
                      { field: 'Email Addresses', key: 'emails' },
                      { field: 'Notes', key: 'notes' },
                      { field: 'Aliases', key: 'aliases' },
                      { field: 'Supporter Status', key: 'supporter_status' },
                      { field: 'District Info', key: 'districts' },
                    ].map((permission) => (
                      <div key={permission.key} className="flex items-center justify-between">
                        <Label htmlFor={permission.key} className="text-sm font-medium">
                          {permission.field}
                        </Label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            id={permission.key}
                            className="sr-only peer"
                            defaultChecked={true}
                            data-testid={`toggle-${permission.key}`}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-6" data-testid="button-save-permissions">
                    Save Permissions
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <Input
                        id="session-timeout"
                        type="number"
                        defaultValue="480"
                        data-testid="input-session-timeout"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-search-results">Max Search Results</Label>
                      <Input
                        id="max-search-results"
                        type="number"
                        defaultValue="100"
                        data-testid="input-max-results"
                      />
                    </div>
                  </div>
                  <Button className="w-full" data-testid="button-save-settings">
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Excel Data Import</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <i className="fas fa-file-excel text-4xl text-green-600 mb-4"></i>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload an Excel file to seed the database with contact data
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="excel-upload"
                      data-testid="input-excel-file"
                    />
                    <Label
                      htmlFor="excel-upload"
                      className="inline-flex items-center px-4 py-2 border border-primary text-primary rounded-md cursor-pointer hover:bg-primary/5"
                    >
                      <i className="fas fa-upload mr-2"></i>
                      Choose Excel File
                    </Label>
                    {excelFile && (
                      <p className="text-sm mt-2 font-medium">{excelFile.name}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleExcelUpload}
                    disabled={!excelFile || isUploading}
                    className="w-full"
                    data-testid="button-upload-excel"
                  >
                    {isUploading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-database mr-2"></i>
                        Import Data
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database Operations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-backup"
                  >
                    <i className="fas fa-save mr-2"></i>
                    Create System Backup
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-validate"
                  >
                    <i className="fas fa-check-circle mr-2"></i>
                    Run Data Validation
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-cleanup"
                  >
                    <i className="fas fa-broom mr-2"></i>
                    Data Cleanup
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    data-testid="button-maintenance"
                  >
                    <i className="fas fa-tools mr-2"></i>
                    System Maintenance Mode
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );

  if (isFullPage) {
    return <div className="min-h-screen bg-background">{content}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
        {content}
      </DialogContent>
    </Dialog>
  );
}
