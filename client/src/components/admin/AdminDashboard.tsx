import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
// Components will be imported when fully implemented
// import UserManagement from "./UserManagement";
// import AuditLogs from "./AuditLogs";
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
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<{totalContacts: number, activeUsers: number, editsToday: number, dataQuality: number}>({
    queryKey: ['/api/admin/stats'],
    enabled: isOpen && user.role === 'admin',
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
                <CardContent className="p-6 text-center text-muted-foreground">
                  <i className="fas fa-users text-4xl mb-4 opacity-50"></i>
                  <p>User management features coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <i className="fas fa-clipboard-list text-4xl mb-4 opacity-50"></i>
                  <p>Audit log features coming soon</p>
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
