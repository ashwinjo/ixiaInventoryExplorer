import { useState } from 'react'
import { useMutation } from '@/hooks/use-api'
import { uploadConfig, setPollingIntervals, resetDatabase, uploadIxNetworkServerConfig } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Trash2, AlertTriangle, Server } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function ConfigPage() {
  const [configText, setConfigText] = useState('')
  const [apiServerConfigText, setApiServerConfigText] = useState('')
  const [intervals, setIntervals] = useState({
    chassis: 60,
    cards: 60,
    ports: 60,
    sensors: 60,
    licensing: 120,
    perf: 60,
    purge: 86400,
  })
  const { mutate: uploadMutate, loading: uploadLoading } = useMutation(uploadConfig)
  const { mutate: uploadIxNetworkMutate, loading: ixNetworkLoading } = useMutation(uploadIxNetworkServerConfig)
  const { mutate: intervalsMutate, loading: intervalsLoading } = useMutation(setPollingIntervals)
  const { mutate: resetMutate, loading: resetLoading } = useMutation(resetDatabase)
  const { toast } = useToast()

  const handleConfigSubmit = (e) => {
    e.preventDefault()

    if (!configText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter configuration data',
      })
      return
    }

    uploadMutate(
      { text: configText },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Configuration uploaded successfully',
          })
          setConfigText('')
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.response?.data?.detail || 'Failed to upload configuration',
          })
        },
      }
    )
  }

  const handleResetDB = () => {
    resetMutate(null, {
      onSuccess: () => {
        toast({
          title: 'Database Reset',
          description: 'All records have been successfully deleted',
        })
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.detail || 'Failed to reset database',
        })
      }
    })
  }

  const handleIxNetworkSubmit = (e) => {
    e.preventDefault()

    if (!apiServerConfigText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter IxNetwork API Server configuration data',
      })
      return
    }

    uploadIxNetworkMutate(
      { text: apiServerConfigText },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'IxNetwork API Server configuration uploaded successfully',
          })
          setApiServerConfigText('')
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.response?.data?.detail || 'Failed to upload IxNetwork API Server configuration',
          })
        },
      }
    )
  }

  const handleIntervalsChange = (field, value) => {
    const numValue = parseInt(value) || 0
    setIntervals((prev) => ({
      ...prev,
      [field]: numValue,
    }))
  }

  const handleIntervalsSubmit = (e) => {
    e.preventDefault()

    // Validate all intervals are positive
    const hasInvalid = Object.values(intervals).some((val) => val <= 0)
    if (hasInvalid) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'All intervals must be greater than 0',
      })
      return
    }

    intervalsMutate(
      {
        chassis: intervals.chassis,
        cards: intervals.cards,
        ports: intervals.ports,
        sensors: intervals.sensors,
        licensing: intervals.licensing,
        perf: intervals.perf,
        purge: intervals.purge,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Polling intervals updated successfully',
          })
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.response?.data?.detail || 'Failed to update polling intervals',
          })
        },
      }
    )
  }

  const exampleConfig = `ADD,192.168.1.100,admin,password
ADD,192.168.1.101,admin,password
DELETE,192.168.1.100,admin,password`

  const exampleIxNetworkConfig = `ADD,192.168.1.200,admin,admin
ADD,192.168.1.201,admin,admin
DELETE,192.168.1.200,admin,admin`

  const intervalFields = [
    { key: 'chassis', label: 'Chassis Polling Interval', description: 'Interval for polling chassis data (seconds)' },
    { key: 'cards', label: 'Cards Polling Interval', description: 'Interval for polling card data (seconds)' },
    { key: 'ports', label: 'Ports Polling Interval', description: 'Interval for polling port data (seconds)' },
    { key: 'sensors', label: 'Sensors Polling Interval', description: 'Interval for polling sensor data (seconds)' },
    { key: 'licensing', label: 'Licensing Polling Interval', description: 'Interval for polling license data (seconds)' },
    { key: 'perf', label: 'Performance Metrics Polling Interval', description: 'Interval for polling performance metrics (seconds)' },
    { key: 'purge', label: 'Data Purge Interval', description: 'Interval for purging old performance data (seconds, typically 86400 = 1 day)' },
  ]

  return (
    <div className="space-y-8">
      {/* Chassis Configuration Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-cyan-400">Chassis Configuration</h2>
            <p className="text-muted-foreground mt-1">
              Add, delete, or update chassis in the inventory
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all">
                <Trash2 size={16} />
                Reset DB
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#0f0f12] border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                  <AlertTriangle size={20} />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  This action cannot be undone. This will permanently delete all configured chassis,
                  inventory records, tags, and performance metrics from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetDB}
                  className="bg-red-600 hover:bg-red-700 text-white border-none"
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Resetting...' : 'Yes, Reset Database'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Configuration</CardTitle>
              <CardDescription>
                Enter chassis configuration in CSV format. Each line should follow: operation,ip,username,password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-slate-300">
                    Configuration (CSV Format)
                  </label>
                  <textarea
                    value={configText}
                    onChange={(e) => setConfigText(e.target.value)}
                    placeholder={exampleConfig}
                    className="w-full min-h-[200px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-tight">
                    Operations: <span className="text-cyan-400">ADD</span>, <span className="text-red-400">DELETE</span>, <span className="text-emerald-400">UPDATE</span>. Format: <span className="italic">operation,ip,username,password</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={uploadLoading} className="bg-cyan-600 hover:bg-cyan-700">
                    {uploadLoading ? 'Uploading...' : 'Upload Configuration'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfigText(exampleConfig)}
                    className="border-white/10 hover:bg-white/5"
                  >
                    Load Example
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfigText('')}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration Format</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 text-cyan-400/80 text-xs uppercase tracking-widest">CSV Format:</h3>
                  <pre className="bg-black/40 border border-white/5 p-4 rounded-xl text-xs overflow-x-auto text-cyan-100/70 font-mono">
                    {exampleConfig}
                  </pre>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-white/40 text-[10px] uppercase tracking-widest">Operations:</h3>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-500 rounded-full"></div> <strong>ADD:</strong> New chassis</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-red-500 rounded-full"></div> <strong>DELETE:</strong> Remove chassis</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full"></div> <strong>UPDATE:</strong> Credentials</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-white/40 text-[10px] uppercase tracking-widest">Fields:</h3>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      <li><strong>operation:</strong> Action to perform</li>
                      <li><strong>ip:</strong> IP address</li>
                      <li><strong>username:</strong> Auth user</li>
                      <li><strong>password:</strong> Auth pass</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-white/5" />

      {/* IxNetwork API Server Configuration Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-purple-400 flex items-center gap-2">
            <Server size={24} />
            IxNetwork API Server Configuration
          </h2>
          <p className="text-muted-foreground mt-1">
            Add, delete, or update IxNetwork API Server instances for session management
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add/Delete API Server</CardTitle>
              <CardDescription>
                Enter API Server configuration in CSV format. Each line should follow: operation,ip,username,password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIxNetworkSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-slate-300">
                    Configuration (CSV Format)
                  </label>
                  <textarea
                    value={apiServerConfigText}
                    onChange={(e) => setApiServerConfigText(e.target.value)}
                    placeholder={exampleIxNetworkConfig}
                    className="w-full min-h-[150px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500/50 transition-all font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-tight">
                    Operations: <span className="text-purple-400">ADD</span>, <span className="text-red-400">DELETE</span>, <span className="text-emerald-400">UPDATE</span>. Format: <span className="italic">operation,ip,username,password</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={ixNetworkLoading} className="bg-purple-600 hover:bg-purple-700">
                    {ixNetworkLoading ? 'Uploading...' : 'Upload Configuration'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setApiServerConfigText(exampleIxNetworkConfig)}
                    className="border-white/10 hover:bg-white/5"
                  >
                    Load Example
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setApiServerConfigText('')}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Server Format</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 text-purple-400/80 text-xs uppercase tracking-widest">CSV Format:</h3>
                  <pre className="bg-black/40 border border-white/5 p-4 rounded-xl text-xs overflow-x-auto text-purple-100/70 font-mono">
                    {exampleIxNetworkConfig}
                  </pre>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-white/40 text-[10px] uppercase tracking-widest">Operations:</h3>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-purple-500 rounded-full"></div> <strong>ADD:</strong> New API Server</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-red-500 rounded-full"></div> <strong>DELETE:</strong> Remove API Server</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full"></div> <strong>UPDATE:</strong> Update Credentials</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-white/40 text-[10px] uppercase tracking-widest">Fields:</h3>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      <li><strong>operation:</strong> Action to perform</li>
                      <li><strong>ip:</strong> API Server IP address</li>
                      <li><strong>username:</strong> Auth user</li>
                      <li><strong>password:</strong> Auth pass</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    <span className="text-purple-400 font-semibold">Note:</span> IxNetwork API Servers are used for session management, traffic generation control, and protocol configuration.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-white/5" />

      {/* Polling Settings Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-teal-400">Polling Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure polling intervals for data collection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Polling Intervals</CardTitle>
              <CardDescription>
                Set the polling intervals (in seconds) for each data category. Lower values mean more frequent updates but higher system load.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIntervalsSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {intervalFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {field.label}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={intervals[field.key]}
                        onChange={(e) => handleIntervalsChange(field.key, e.target.value)}
                        className="bg-black/40 border-white/10 focus:ring-teal-500/30"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground italic leading-tight">
                        {field.description}
                      </p>
                      {field.key === 'purge' && (
                        <p className="text-[10px] text-teal-400/60 font-mono">
                          Current: {Math.floor(intervals.purge / 3600)} hours
                        </p>
                      )}
                      {field.key !== 'purge' && (
                        <p className="text-[10px] text-teal-400/60 font-mono">
                          Current: {Math.floor(intervals[field.key] / 60)} minutes
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="submit" disabled={intervalsLoading} className="bg-teal-600 hover:bg-teal-700">
                    {intervalsLoading ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIntervals({
                        chassis: 60,
                        cards: 60,
                        ports: 60,
                        sensors: 60,
                        licensing: 120,
                        perf: 60,
                        purge: 86400,
                      })
                    }}
                    className="border-white/10 hover:bg-white/5"
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-xs text-slate-400">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-semibold text-teal-400/80">Chassis</span>
                  <span>1 minute</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-semibold text-teal-400/80">Cards</span>
                  <span>1 minute</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-semibold text-teal-400/80">Ports</span>
                  <span>1 minute</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-semibold text-teal-400/80">Sensors</span>
                  <span>1 minute</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-semibold text-teal-400/80">Licensing</span>
                  <span>2 minutes</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-semibold text-teal-400/80">Performance</span>
                  <span>1 minute</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-teal-400/80">Data Purge</span>
                  <span>24 hours</span>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-xl bg-teal-500/5 border border-teal-500/10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400 mb-2">Pro Tip</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  Lower intervals provide more precision but increase Chassis CPU load.
                  For environments with 50+ chassis, consider balancing intervals based on urgency.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ConfigPage
