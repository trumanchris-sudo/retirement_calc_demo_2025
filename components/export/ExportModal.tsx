"use client";

import React, { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Table,
  Database,
  Wallet,
  Cloud,
  Printer,
  Download,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import {
  exportData,
  getAvailableFormats,
  importFromJSON,
  readBackupFile,
  type ExportFormat,
  type ExportOptions,
  type ExportResult,
  type BackupData,
} from '@/lib/export';
import type { CalculationResult, CalculatorInputs } from '@/types/calculator';
import { cn } from '@/lib/utils';

// ==================== Types ====================

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputs: Partial<CalculatorInputs>;
  results: CalculationResult | null;
  userName?: string;
  onRestore?: (inputs: Partial<CalculatorInputs>, results: CalculationResult) => void;
}

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

interface FormatState {
  status: ExportStatus;
  message?: string;
}

// ==================== Icon Map ====================

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Table,
  Database,
  Wallet,
  Cloud,
  Printer,
};

// ==================== Export Modal Component ====================

export function ExportModal({
  open,
  onOpenChange,
  inputs,
  results,
  userName = 'Client',
  onRestore,
}: ExportModalProps) {
  const [formatStates, setFormatStates] = useState<Record<ExportFormat, FormatState>>({
    pdf: { status: 'idle' },
    excel: { status: 'idle' },
    csv: { status: 'idle' },
    json: { status: 'idle' },
    wallet: { status: 'idle' },
    'google-sheets': { status: 'idle' },
    print: { status: 'idle' },
  });

  const [exportOptions, setExportOptions] = useState({
    includeCharts: true,
    includeProjections: true,
    includeInputs: true,
    includeTaxAnalysis: true,
    includeGenerational: true,
    userName,
  });

  const [activeTab, setActiveTab] = useState<'export' | 'restore'>('export');
  const [restoreStatus, setRestoreStatus] = useState<ExportStatus>('idle');
  const [restoreMessage, setRestoreMessage] = useState<string>('');
  const [restoredData, setRestoredData] = useState<BackupData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formats = getAvailableFormats();

  const hasResults = results !== null;

  // Handle export for a specific format
  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!results) return;

    setFormatStates(prev => ({
      ...prev,
      [format]: { status: 'loading' },
    }));

    try {
      const options: ExportOptions = {
        format,
        ...exportOptions,
      };

      const result: ExportResult = await exportData(inputs, results, options);

      setFormatStates(prev => ({
        ...prev,
        [format]: {
          status: result.success ? 'success' : 'error',
          message: result.success
            ? result.fileName || 'Export complete'
            : result.error || 'Export failed',
        },
      }));

      // Reset success state after delay
      if (result.success) {
        setTimeout(() => {
          setFormatStates(prev => ({
            ...prev,
            [format]: { status: 'idle' },
          }));
        }, 3000);
      }
    } catch (error) {
      setFormatStates(prev => ({
        ...prev,
        [format]: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Export failed',
        },
      }));
    }
  }, [results, inputs, exportOptions]);

  // Handle file selection for restore
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreStatus('loading');
    setRestoreMessage('Reading backup file...');

    try {
      const content = await readBackupFile(file);
      const result = importFromJSON(content);

      if (result.success && result.data) {
        setRestoredData(result.data);
        setRestoreStatus('success');
        setRestoreMessage(`Backup from ${new Date(result.data.exportedAt).toLocaleDateString()} loaded successfully.`);
      } else {
        setRestoreStatus('error');
        setRestoreMessage(result.error || 'Failed to parse backup file');
      }
    } catch (error) {
      setRestoreStatus('error');
      setRestoreMessage(error instanceof Error ? error.message : 'Failed to read file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Apply restored data
  const handleApplyRestore = useCallback(() => {
    if (restoredData && onRestore) {
      onRestore(restoredData.inputs, restoredData.results);
      onOpenChange(false);
    }
  }, [restoredData, onRestore, onOpenChange]);

  // Get status icon for format
  const getStatusIcon = (status: ExportStatus) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Plan
          </DialogTitle>
          <DialogDescription>
            Export your retirement plan in multiple formats or restore from a backup.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === 'export' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('export')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant={activeTab === 'restore' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('restore')}
          >
            <Upload className="h-4 w-4 mr-2" />
            Restore
          </Button>
        </div>

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* Export Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Options</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-projections" className="text-sm text-muted-foreground">
                    Year-by-Year Data
                  </Label>
                  <Switch
                    id="include-projections"
                    checked={exportOptions.includeProjections}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeProjections: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-tax" className="text-sm text-muted-foreground">
                    Tax Analysis
                  </Label>
                  <Switch
                    id="include-tax"
                    checked={exportOptions.includeTaxAnalysis}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeTaxAnalysis: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-inputs" className="text-sm text-muted-foreground">
                    Input Parameters
                  </Label>
                  <Switch
                    id="include-inputs"
                    checked={exportOptions.includeInputs}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeInputs: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-gen" className="text-sm text-muted-foreground">
                    Generational Wealth
                  </Label>
                  <Switch
                    id="include-gen"
                    checked={exportOptions.includeGenerational}
                    onCheckedChange={(checked) =>
                      setExportOptions(prev => ({ ...prev, includeGenerational: checked }))
                    }
                  />
                </div>
              </div>

              {/* User Name Input */}
              <div className="flex items-center gap-3">
                <Label htmlFor="user-name" className="text-sm text-muted-foreground whitespace-nowrap">
                  Report Name:
                </Label>
                <Input
                  id="user-name"
                  value={exportOptions.userName}
                  onChange={(e) =>
                    setExportOptions(prev => ({ ...prev, userName: e.target.value }))
                  }
                  placeholder="Enter name for reports"
                  className="flex-1"
                />
              </div>
            </div>

            <Separator />

            {/* Export Formats */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Choose Format</Label>

              {!hasResults && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    Run the calculator first to enable exports
                  </span>
                </div>
              )}

              <div className="grid gap-2">
                {formats.map((format) => {
                  const Icon = iconMap[format.icon] || FileText;
                  const state = formatStates[format.id];
                  const isDisabled = !hasResults || !format.available || state.status === 'loading';

                  return (
                    <button
                      key={format.id}
                      onClick={() => handleExport(format.id)}
                      disabled={isDisabled}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                        "hover:bg-accent hover:border-accent-foreground/20",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                        state.status === 'success' && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
                        state.status === 'error' && "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg",
                        "bg-primary/10 text-primary"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{format.name}</span>
                          {format.id === 'wallet' && (
                            <Badge variant="secondary" className="text-xs">
                              iOS
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {state.message || format.description}
                        </p>
                      </div>

                      <div className="flex items-center">
                        {state.status !== 'idle' ? (
                          getStatusIcon(state.status)
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Restore Tab */}
        {activeTab === 'restore' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Restore your retirement plan from a previously exported JSON backup file.
            </div>

            {/* File Upload Area */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                "hover:border-primary/50 hover:bg-accent/50",
                restoreStatus === 'success' && "border-green-500 bg-green-50 dark:bg-green-950",
                restoreStatus === 'error' && "border-red-500 bg-red-50 dark:bg-red-950"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="backup-file"
              />

              {restoreStatus === 'loading' ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">{restoreMessage}</span>
                </div>
              ) : restoreStatus === 'success' && restoredData ? (
                <div className="flex flex-col items-center gap-3">
                  <Check className="h-8 w-8 text-green-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{restoreMessage}</p>
                    <p className="text-xs text-muted-foreground">
                      Calculator Version: {restoredData.calculatorVersion}
                    </p>
                  </div>
                </div>
              ) : restoreStatus === 'error' ? (
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <p className="text-sm text-red-600 dark:text-red-400">{restoreMessage}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRestoreStatus('idle');
                      setRestoreMessage('');
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <label htmlFor="backup-file" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JSON backup file (.json)
                      </p>
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Preview of restored data */}
            {restoredData && restoreStatus === 'success' && (
              <div className="space-y-3">
                <Separator />
                <Label className="text-sm font-medium">Backup Preview</Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Filing Status:</span>
                    <span className="ml-2 font-medium">
                      {restoredData.inputs.marital === 'married' ? 'Married' : 'Single'}
                    </span>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Age:</span>
                    <span className="ml-2 font-medium">{restoredData.inputs.age1}</span>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Retirement:</span>
                    <span className="ml-2 font-medium">{restoredData.results.finReal?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Legacy:</span>
                    <span className="ml-2 font-medium">{restoredData.results.eolReal?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>

          {activeTab === 'restore' && restoredData && restoreStatus === 'success' && onRestore && (
            <Button onClick={handleApplyRestore}>
              <Check className="h-4 w-4 mr-2" />
              Apply Backup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Export Button Component ====================

interface ExportButtonProps {
  inputs: Partial<CalculatorInputs>;
  results: CalculationResult | null;
  userName?: string;
  onRestore?: (inputs: Partial<CalculatorInputs>, results: CalculationResult) => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ExportButton({
  inputs,
  results,
  userName,
  onRestore,
  variant = 'outline',
  size = 'default',
  className,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>

      <ExportModal
        open={open}
        onOpenChange={setOpen}
        inputs={inputs}
        results={results}
        userName={userName}
        onRestore={onRestore}
      />
    </>
  );
}

// ==================== Quick Export Dropdown ====================

interface QuickExportProps {
  inputs: Partial<CalculatorInputs>;
  results: CalculationResult | null;
  userName?: string;
}

export function QuickExportMenu({ inputs, results, userName }: QuickExportProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const formats = getAvailableFormats().slice(0, 4); // Show first 4 formats

  const handleQuickExport = async (format: ExportFormat) => {
    if (!results) return;

    setIsExporting(format);

    try {
      await exportData(inputs, results, {
        format,
        userName,
        includeProjections: true,
        includeTaxAnalysis: true,
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(null);
    }
  };

  if (!results) return null;

  return (
    <div className="flex gap-2">
      {formats.map((format) => {
        const Icon = iconMap[format.icon] || FileText;
        const isLoading = isExporting === format.id;

        return (
          <Button
            key={format.id}
            variant="ghost"
            size="icon"
            onClick={() => handleQuickExport(format.id)}
            disabled={isLoading}
            title={format.name}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
          </Button>
        );
      })}
    </div>
  );
}

export default ExportModal;
