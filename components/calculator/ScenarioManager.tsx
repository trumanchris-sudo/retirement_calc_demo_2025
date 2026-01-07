'use client';

import React, { useState, useEffect } from 'react';
import { usePlanConfig } from '@/lib/plan-config-context';
import {
  getAllScenarios,
  saveScenario,
  loadScenario,
  deleteScenario,
  duplicateScenario,
  exportScenarios,
  importScenarios,
  type SavedScenario,
} from '@/lib/scenarioManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Save,
  FolderOpen,
  Copy,
  Trash2,
  Download,
  Upload,
  Calendar,
  Clock,
} from 'lucide-react';

export function ScenarioManager() {
  const { config, setConfig } = usePlanConfig();
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');

  // Load scenarios on mount
  useEffect(() => {
    refreshScenarios();
  }, []);

  const refreshScenarios = () => {
    setScenarios(getAllScenarios());
  };

  const handleSave = () => {
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name');
      return;
    }

    try {
      saveScenario(config, scenarioName.trim(), scenarioDescription.trim() || undefined);
      setScenarioName('');
      setScenarioDescription('');
      setShowSaveDialog(false);
      refreshScenarios();
      alert(`✅ Scenario "${scenarioName}" saved successfully!`);
    } catch (error) {
      alert(`Failed to save scenario: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoad = (scenario: SavedScenario) => {
    if (confirm(`Load scenario "${scenario.name}"? This will replace your current plan.`)) {
      setConfig(scenario.config);
      setShowLoadDialog(false);
      alert(`✅ Scenario "${scenario.name}" loaded!`);
    }
  };

  const handleDuplicate = (scenario: SavedScenario) => {
    const newScenario = duplicateScenario(scenario.id);
    if (newScenario) {
      refreshScenarios();
      alert(`✅ Created copy: "${newScenario.name}"`);
    }
  };

  const handleDelete = (scenario: SavedScenario) => {
    if (confirm(`Delete scenario "${scenario.name}"? This cannot be undone.`)) {
      deleteScenario(scenario.id);
      refreshScenarios();
      alert(`🗑️ Scenario "${scenario.name}" deleted`);
    }
  };

  const handleExport = () => {
    const json = exportScenarios();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retirement-scenarios-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = importScenarios(event.target?.result as string);
        if (result.success) {
          refreshScenarios();
          alert(`✅ Imported ${result.imported} scenario(s)${result.errors.length > 0 ? ` with ${result.errors.length} error(s)` : ''}`);
        } else {
          alert(`❌ Import failed: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        alert(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Scenario Manager
        </CardTitle>
        <CardDescription>
          Save, load, and compare different retirement planning scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowSaveDialog(true)} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Current Plan
          </Button>
          <Button
            onClick={() => setShowLoadDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
            disabled={scenarios.length === 0}
          >
            <FolderOpen className="w-4 h-4" />
            Load Scenario
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
            disabled={scenarios.length === 0}
          >
            <Download className="w-4 h-4" />
            Export All
          </Button>
          <label>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button variant="outline" className="flex items-center gap-2" asChild>
              <span>
                <Upload className="w-4 h-4" />
                Import
              </span>
            </Button>
          </label>
        </div>

        {/* Scenarios List */}
        {scenarios.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Saved Scenarios ({scenarios.length})</h4>
              <div className="grid gap-2">
                {scenarios.map((scenario) => (
                  <Card key={scenario.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold truncate">{scenario.name}</h5>
                        {scenario.description && (
                          <p className="text-sm text-muted-foreground truncate">{scenario.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(scenario.createdAt)}
                          </span>
                          {scenario.updatedAt !== scenario.createdAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Updated {formatDate(scenario.updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLoad(scenario)}
                          title="Load this scenario"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicate(scenario)}
                          title="Duplicate this scenario"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(scenario)}
                          title="Delete this scenario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Scenario</DialogTitle>
            <DialogDescription>
              Save your current retirement plan as a scenario for later comparison
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scenario-name">Scenario Name *</Label>
              <Input
                id="scenario-name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Conservative Plan, Retire at 60"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenario-description">Description (Optional)</Label>
              <Input
                id="scenario-description"
                value={scenarioDescription}
                onChange={(e) => setScenarioDescription(e.target.value)}
                placeholder="e.g., Assumes 7% returns, max contributions"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Scenario</DialogTitle>
            <DialogDescription>
              Choose a scenario to load. This will replace your current plan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4 max-h-[400px] overflow-y-auto">
            {scenarios.map((scenario) => (
              <Card
                key={scenario.id}
                className="p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleLoad(scenario)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h5 className="font-semibold">{scenario.name}</h5>
                    {scenario.description && (
                      <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Created {formatDate(scenario.createdAt)}</span>
                      {scenario.updatedAt !== scenario.createdAt && (
                        <span>Updated {formatDate(scenario.updatedAt)}</span>
                      )}
                    </div>
                  </div>
                  <FolderOpen className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
