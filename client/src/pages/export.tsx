import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMutation, useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Download,
  Filter,
  Users,
  Calendar,
  MapPin,
  UserCheck,
  Vote,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X
} from "lucide-react";

interface ExportFilters {
  exportType: 'all' | 'active-voters' | 'supporters' | 'volunteers';
  dateRange: {
    type: 'all' | 'created' | 'updated';
    startDate: string;
    endDate: string;
  };
  supporterStatus: string[];
  volunteerStatus: string[];
  party: string[];
  zipCodes: string[];
  ageRange: {
    min: string;
    max: string;
  };
}

interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface ExportOptionsResponse {
  parties: string[];
  supporterStatuses: string[];
  volunteerStatuses: string[];
}

interface PreviewResponse {
  count: number;
}

interface StartExportResponse {
  job: ExportJob;
}

export default function ExportPage() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [filters, setFilters] = useState<ExportFilters>({
    exportType: 'all',
    dateRange: {
      type: 'all',
      startDate: '',
      endDate: ''
    },
    supporterStatus: [],
    volunteerStatus: [],
    party: [],
    zipCodes: [],
    ageRange: {
      min: '',
      max: ''
    }
  });

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [currentExport, setCurrentExport] = useState<ExportJob | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Get export options (parties, supporter statuses, etc.)
  const { data: exportOptions, error: optionsError } = useQuery<ExportOptionsResponse>({
    queryKey: ['/api/admin/export/options'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/export/options');
      return res.json();
    },
    retry: false,
    enabled: !!user && user.role === 'admin'
  });

  // Get export history
  const { data: exportHistory, refetch: refetchHistory } = useQuery<ExportJob[]>({
    queryKey: ['/api/admin/export/history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/export/history');
      return res.json();
    },
    retry: false,
    enabled: !!user && user.role === 'admin'
  });

  // Preview count mutation
  const previewMutation = useMutation<PreviewResponse, Error, ExportFilters>({
    mutationFn: async (filters: ExportFilters) => {
      const res = await apiRequest('POST', '/api/admin/export/preview', filters);
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewCount(data.count);
    },
    onError: (error: any) => {
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to get preview count",
        variant: "destructive"
      });
    }
  });

  // Start export mutation
  const startExportMutation = useMutation<StartExportResponse, Error, ExportFilters>({
    mutationFn: async (filters: ExportFilters) => {
      const res = await apiRequest('POST', '/api/admin/export/start', filters);
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentExport(data.job);
      // Start listening for progress updates
      const es = new EventSource(`/api/admin/export/progress/${data.job.id}`);
      setEventSource(es);

      es.onmessage = (event) => {
        const progressData = JSON.parse(event.data);
        setCurrentExport(progressData);

        if (progressData.status === 'completed' || progressData.status === 'failed') {
          es.close();
          setEventSource(null);
          refetchHistory();

          if (progressData.status === 'completed') {
            toast({
              title: "Export Complete",
              description: `Successfully exported ${progressData.totalRecords} contacts`,
            });
          } else {
            toast({
              title: "Export Failed",
              description: progressData.error || "Export failed",
              variant: "destructive"
            });
          }
        }
      };

      es.onerror = () => {
        es.close();
        setEventSource(null);
      };
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to start export",
        variant: "destructive"
      });
    }
  });

  // Update preview when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      previewMutation.mutate(filters);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const handleFilterChange = (key: keyof ExportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExportTypeChange = (type: string) => {
    setFilters(prev => ({
      ...prev,
      exportType: type as any
    }));
  };

  const handleStartExport = () => {
    if (!previewCount || previewCount === 0) {
      toast({
        title: "No Data to Export",
        description: "No contacts match your current filters",
        variant: "destructive"
      });
      return;
    }

    startExportMutation.mutate(filters);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has admin role
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You need admin privileges to access the export functionality.</p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-background">
      {!isMobile && (
        <Sidebar user={user} />
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onProfileClick={() => {}}
          onNotificationClick={() => {}}
          onMobileMenuClick={() => {}}
          showMobileMenu={isMobile}
        />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold">Data Export</h1>
              <p className="text-muted-foreground">
                Export contact data with advanced filtering options
              </p>
            </div>

            {/* Current Export Progress */}
            {currentExport && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {currentExport.status === 'processing' && <RefreshCw className="w-5 h-5 animate-spin" />}
                    {currentExport.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {currentExport.status === 'failed' && <AlertCircle className="w-5 h-5 text-red-600" />}
                    Export in Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={currentExport.progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{currentExport.processedRecords} / {currentExport.totalRecords} contacts</span>
                      <span>{currentExport.progress}%</span>
                    </div>
                    {currentExport.status === 'completed' && currentExport.downloadUrl && (
                      <Button asChild className="w-full">
                        <a href={currentExport.downloadUrl} download>
                          <Download className="w-4 h-4 mr-2" />
                          Download Export
                        </a>
                      </Button>
                    )}
                    {currentExport.status === 'failed' && (
                      <p className="text-sm text-red-600">{currentExport.error}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Filters */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Export Filters
                    </CardTitle>
                    <CardDescription>
                      Configure what data to export
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Export Type */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Export Type</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { value: 'all', label: 'All Contacts', icon: Users },
                          { value: 'active-voters', label: 'Active Voters Only', icon: Vote },
                          { value: 'supporters', label: 'Confirmed Supporters', icon: UserCheck },
                          { value: 'volunteers', label: 'Potential Volunteers', icon: UserCheck }
                        ].map(({ value, label, icon: Icon }) => (
                          <Button
                            key={value}
                            variant={filters.exportType === value ? "default" : "outline"}
                            onClick={() => handleExportTypeChange(value)}
                            className="justify-start h-auto p-3"
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            <div className="text-left">
                              <div className="font-medium">{label}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Advanced Filters */}
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="advanced">
                        <AccordionTrigger>Advanced Filters (Optional)</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          {/* Date Range */}
                          <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Date Range
                            </Label>
                            <Select
                              value={filters.dateRange.type}
                              onValueChange={(value) => handleFilterChange('dateRange', { ...filters.dateRange, type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="created">Created Date</SelectItem>
                                <SelectItem value="updated">Last Updated</SelectItem>
                              </SelectContent>
                            </Select>

                            {filters.dateRange.type !== 'all' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-sm">From</Label>
                                  <Input
                                    type="date"
                                    value={filters.dateRange.startDate}
                                    onChange={(e) => handleFilterChange('dateRange', {
                                      ...filters.dateRange,
                                      startDate: e.target.value
                                    })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm">To</Label>
                                  <Input
                                    type="date"
                                    value={filters.dateRange.endDate}
                                    onChange={(e) => handleFilterChange('dateRange', {
                                      ...filters.dateRange,
                                      endDate: e.target.value
                                    })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Age Range */}
                          <div className="space-y-3">
                            <Label>Age Range</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-sm">Min Age</Label>
                                <Input
                                  type="number"
                                  placeholder="18"
                                  value={filters.ageRange.min}
                                  onChange={(e) => handleFilterChange('ageRange', {
                                    ...filters.ageRange,
                                    min: e.target.value
                                  })}
                                />
                              </div>
                              <div>
                                <Label className="text-sm">Max Age</Label>
                                <Input
                                  type="number"
                                  placeholder="100"
                                  value={filters.ageRange.max}
                                  onChange={(e) => handleFilterChange('ageRange', {
                                    ...filters.ageRange,
                                    max: e.target.value
                                  })}
                                />
                              </div>
                            </div>
                          </div>

                          {/* ZIP Codes */}
                          <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              ZIP Codes
                            </Label>
                            <Input
                              placeholder="32801, 32803, 32804 (comma separated)"
                              value={filters.zipCodes.join(', ')}
                              onChange={(e) => handleFilterChange('zipCodes',
                                e.target.value.split(',').map(zip => zip.trim()).filter(Boolean)
                              )}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </div>

              {/* Preview & Export */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Export Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {previewMutation.isPending ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin" />
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-3xl font-bold text-primary">
                            {previewCount?.toLocaleString() || '0'}
                          </div>
                          <div className="text-sm text-muted-foreground">contacts will be exported</div>
                        </div>
                      )}

                      <Button
                        onClick={handleStartExport}
                        disabled={!previewCount || previewCount === 0 || startExportMutation.isPending || !!currentExport}
                        className="w-full"
                        size="lg"
                      >
                        {startExportMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Starting Export...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Start Export
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Export History */}
                {exportHistory && exportHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Recent Exports
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {exportHistory.slice(0, 5).map((job: ExportJob) => (
                          <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {job.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                                {job.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-600" />}
                                {job.status === 'processing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                                <span className="font-medium text-sm">
                                  {job.totalRecords.toLocaleString()} contacts
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(job.createdAt)}
                              </div>
                            </div>
                            {job.status === 'completed' && job.downloadUrl && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={job.downloadUrl} download>
                                  <Download className="w-3 h-3" />
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}