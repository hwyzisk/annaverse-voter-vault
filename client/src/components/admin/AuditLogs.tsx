import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";
import type { AuditLogWithDetails } from "@/lib/types";

interface AuditLogsProps {
  user: User;
}

export default function AuditLogs({ user }: AuditLogsProps) {
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("7");
  const [bulkRevertUser, setBulkRevertUser] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: auditLogs = [], isLoading } = useQuery<AuditLogWithDetails[]>({
    queryKey: ['/api/admin/audit-logs', selectedUser === "all" ? undefined : selectedUser, timeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedUser !== "all") params.append('userId', selectedUser);
      params.append('limit', '100');
      
      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const revertMutation = useMutation({
    mutationFn: async (logId: string) => {
      await apiRequest('POST', `/api/admin/revert/${logId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/audit-logs'] });
      toast({ title: "Change reverted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to revert change",
        variant: "destructive",
      });
    },
  });

  const bulkRevertMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('POST', `/api/admin/bulk-revert/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/audit-logs'] });
      toast({ title: "All changes reverted successfully" });
      setBulkRevertUser(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to bulk revert changes",
        variant: "destructive",
      });
    },
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return 'fa-plus text-green-600';
      case 'update':
        return 'fa-edit text-blue-600';
      case 'delete':
        return 'fa-trash text-red-600';
      case 'revert':
        return 'fa-undo text-purple-600';
      default:
        return 'fa-circle text-gray-600';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'delete':
        return 'Deleted';
      case 'revert':
        return 'Reverted';
      default:
        return action;
    }
  };

  const formatUserName = (userInfo: any) => {
    if (userInfo?.firstName && userInfo?.lastName) {
      return `${userInfo.firstName} ${userInfo.lastName}`;
    }
    if (userInfo?.firstName) return userInfo.firstName;
    if (userInfo?.email) return userInfo.email.split('@')[0];
    return "Unknown User";
  };

  const filteredLogs = auditLogs.filter(log => {
    if (!log.createdAt) return false;
    const logDate = new Date(log.createdAt);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeFilter));
    return logDate >= cutoffDate;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Audit Logs</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-40" data-testid="select-audit-user">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {formatUserName(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-36" data-testid="select-time-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            {selectedUser !== "all" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    data-testid="button-bulk-revert"
                  >
                    <i className="fas fa-undo mr-2"></i>
                    Bulk Revert
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Bulk Revert Changes</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will revert ALL changes made by the selected user. This action cannot be undone.
                      Are you sure you want to proceed?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => bulkRevertMutation.mutate(selectedUser)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Revert All Changes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-clipboard-list text-4xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">No audit logs found for the selected criteria</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start space-x-3 p-4 border border-border rounded-md"
                data-testid={`audit-log-${log.id}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  log.action === 'create' ? 'bg-green-100' :
                  log.action === 'update' ? 'bg-blue-100' :
                  log.action === 'delete' ? 'bg-red-100' :
                  'bg-purple-100'
                }`}>
                  <i className={`fas ${getActionIcon(log.action)} text-xs`}></i>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium" data-testid={`audit-user-${log.id}`}>
                          {formatUserName(log.user)}
                        </span>
                        <span> {getActionLabel(log.action).toLowerCase()}</span>
                        {log.contact && (
                          <>
                            <span> contact </span>
                            <span className="font-medium" data-testid={`audit-contact-${log.id}`}>
                              {log.contact.fullName}
                            </span>
                          </>
                        )}
                        {log.fieldName && (
                          <>
                            <span> field </span>
                            <Badge variant="secondary" className="mx-1">
                              {log.fieldName}
                            </Badge>
                          </>
                        )}
                      </p>
                      
                      {(log.oldValue || log.newValue) && (
                        <div className="mt-1 text-xs text-muted-foreground space-y-1">
                          {log.oldValue && (
                            <p>
                              <span className="font-medium">Before:</span> {log.oldValue}
                            </p>
                          )}
                          {log.newValue && (
                            <p>
                              <span className="font-medium">After:</span> {log.newValue}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-2" data-testid={`audit-date-${log.id}`}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'No date available'}
                      </p>
                    </div>
                    
                    {log.action !== 'revert' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-revert-${log.id}`}
                          >
                            <i className="fas fa-undo text-xs"></i>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revert Change</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will revert this specific change. This action cannot be undone.
                              Are you sure you want to proceed?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revertMutation.mutate(log.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revert Change
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
