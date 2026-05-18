import { useState } from 'react'
import { useMutation } from '@/hooks/use-api'
import { uploadConfig, setPollingIntervals, resetDatabase } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Trash2, AlertTriangle } from 'lucide-react'
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
  const { mutate: intervalsMutate, loading: intervalsLoading } = useMutation(setPollingIntervals)
  const { mutate: resetMutate, loading: resetLoading } = useMutation(resetDatabase)
  const { toast } = useToast()

  const handleConfigSubmit = (e) => {
    e.preventDefault()
    if (!configText.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter configuration data' })
      return
    }
    uploadMutate({ text: configText }, {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Configuration uploaded successfully' })
        setConfigText('')
      },
      onError: (error) => {
        toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.detail || 'Failed to upload configuration' })
      },
    })
  }

  const handleResetDB = () => {
    resetMutate(null, {
      onSuccess: () => toast({ title: 'Database Reset', description: 'All records have been successfully deleted' }),
      onError: (error) => toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.detail || 'Failed to reset database' }),
    })
  }

  const handleIntervalsChange = (field, value) => {
    setIntervals((prev) => ({ ...prev, [field]: parseInt(value) || 0 }))
  }

  const handleIntervalsSubmit = (e) => {
    e.preventDefault()
    if (Object.values(intervals).some((val) => val <= 0)) {
      toast({ variant: 'destructive', title: 'Error', description: 'All intervals must be greater than 0' })
      return
    }
    intervalsMutate(intervals, {
      onSuccess: () => toast({ title: 'Success', description: 'Polling intervals updated successfully' }),
      onError: (error) => toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.detail || 'Failed to update polling intervals' }),
    })
  }

  const exampleConfig = `ADD,192.168.1.100,admin,password
ADD,192.168.1.101,admin,password
DELETE,192.168.1.100,admin,password`

  const intervalFields = [
    { key: 'chassis',   label: 'Chassis',     description: 'Chassis data polling (seconds)' },
    { key: 'cards',     label: 'Cards',        description: 'Card data polling (seconds)' },
    { key: 'ports',     label: 'Ports',        description: 'Port data polling (seconds)' },
    { key: 'sensors',   label: 'Sensors',      description: 'Sensor data polling (seconds)' },
    { key: 'licensing', label: 'Licensing',    description: 'License data polling (seconds)' },
    { key: 'perf',      label: 'Performance',  description: 'Performance metrics polling (seconds)' },
    { key: 'purge',     label: 'Data Purge',   description: 'Old data purge interval (86400 = 24h)' },
  ]

  const textareaStyle = {
    width: '100%',
    minHeight: '120px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-med)',
    background: 'var(--surface-alt)',
    padding: '8px 12px',
    fontSize: '0.80rem',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    resize: 'vertical',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Configuration</h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Manage chassis inventory and polling settings
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 size={14} />
              Reset DB
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent style={{ background: 'var(--surface)', border: '1px solid var(--border-med)', borderTop: '2px solid var(--crimson)' }}>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2" style={{ color: 'var(--crimson)' }}>
                <AlertTriangle size={16} />
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription style={{ color: 'var(--text-muted)' }}>
                This action cannot be undone. Permanently deletes all configured chassis,
                inventory records, tags, and performance metrics.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetDB} disabled={resetLoading}>
                {resetLoading ? 'Resetting...' : 'Yes, Reset Database'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Chassis Config */}
      <Card>
        <CardHeader>
          <CardTitle>Chassis Configuration</CardTitle>
          <CardDescription>Add, delete, or update chassis in inventory</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div>
              <label className="block mb-2" style={{ fontSize: '0.68rem', fontWeight: 400, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Configuration (CSV Format)
              </label>
              <textarea
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                placeholder={exampleConfig}
                style={textareaStyle}
                required
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={uploadLoading}>
                {uploadLoading ? 'Uploading...' : 'Upload'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfigText(exampleConfig)}>
                Load Example
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfigText('')}>
                Clear
              </Button>
            </div>
          </form>

          <div style={{ borderTop: '1px solid var(--border-k)', paddingTop: '12px' }}>
            <h3 style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>
              CSV Format
            </h3>
            <pre style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius)', padding: '10px 12px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflowX: 'auto' }}>
              {exampleConfig}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 style={{ fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>Operations</h3>
              <ul className="space-y-1" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <li className="flex items-center gap-2"><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)', flexShrink: 0 }} /><strong>ADD:</strong> New chassis</li>
                <li className="flex items-center gap-2"><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--crimson)', flexShrink: 0 }} /><strong>DELETE:</strong> Remove</li>
                <li className="flex items-center gap-2"><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} /><strong>UPDATE:</strong> Credentials</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px' }}>Fields</h3>
              <ul className="space-y-1" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <li><strong>operation:</strong> Action</li>
                <li><strong>ip:</strong> IP address</li>
                <li><strong>username:</strong> Auth user</li>
                <li><strong>password:</strong> Auth pass</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <hr style={{ borderColor: 'var(--border-k)' }} />

      {/* Polling Settings */}
      <div className="space-y-6">
        <div>
          <h2 className="page-title">Polling Settings</h2>
          <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Configure polling intervals for data collection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Polling Intervals</CardTitle>
              <CardDescription>
                Set intervals (seconds) per data category. Lower = more frequent, higher CPU load.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIntervalsSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {intervalFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                        {field.label}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={intervals[field.key]}
                        onChange={(e) => handleIntervalsChange(field.key, e.target.value)}
                        required
                      />
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        {field.description}
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {field.key === 'purge'
                          ? `= ${Math.floor(intervals[field.key] / 3600)} hours`
                          : `= ${Math.floor(intervals[field.key] / 60)} minutes`}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="submit" disabled={intervalsLoading}>
                    {intervalsLoading ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIntervals({ chassis: 60, cards: 60, ports: 60, sensors: 60, licensing: 120, perf: 60, purge: 86400 })}
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
              <div className="space-y-3" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {[
                  { label: 'Chassis',    value: '1 minute' },
                  { label: 'Cards',      value: '1 minute' },
                  { label: 'Ports',      value: '1 minute' },
                  { label: 'Sensors',    value: '1 minute' },
                  { label: 'Licensing',  value: '2 minutes' },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} className="flex items-center justify-between" style={{ paddingBottom: i < arr.length - 1 ? '8px' : 0, borderBottom: i < arr.length - 1 ? '1px solid var(--border-k)' : 'none' }}>
                    <span style={{ fontWeight: 500, color: 'var(--cyan)' }}>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', padding: '12px', borderRadius: 'var(--radius)', background: 'var(--amber-dim)', border: '1px solid var(--amber-border)' }}>
                <h4 style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '6px' }}>
                  Pro Tip
                </h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
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
