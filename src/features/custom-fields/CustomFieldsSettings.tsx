'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlusCircle, Trash2, Settings2, Loader2, ListChecks } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { CustomFieldDefinition, CustomFieldType } from '@/types'
import { saveCustomFieldDefinitions } from '@/lib/actions'
import { useI18n } from '@/components/providers/LanguageProvider'

type LocalField = {
  id?: string
  key: string
  name: string
  field_type: CustomFieldType
  is_required: boolean
  optionsText: string
}

const EMPTY_FIELD: LocalField = {
  key: '',
  name: '',
  field_type: 'text',
  is_required: false,
  optionsText: '',
}

function toKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function CustomFieldsSettings({ initialFields }: { initialFields: CustomFieldDefinition[] }) {
  const { language } = useI18n()
  const isEn = language === 'en'
  const [fields, setFields] = React.useState<LocalField[]>(
    initialFields.map((field) => ({
      id: field.id,
      key: field.key,
      name: field.name,
      field_type: field.field_type,
      is_required: field.is_required,
      optionsText: (field.options ?? []).map((opt) => opt.value).join(', '),
    })),
  )
  const [isSaving, setIsSaving] = React.useState(false)

  const addField = () => setFields((prev) => [...prev, { ...EMPTY_FIELD }])

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
    toast.info(isEn ? 'Field removed from list.' : 'Field dihapus dari daftar.')
  }

  const updateField = <K extends keyof LocalField>(index: number, key: K, value: LocalField[K]) => {
    setFields((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  }

  const handleSave = async () => {
    setIsSaving(true)

    const normalized = fields.map((field) => {
      const key = field.key.trim() || toKey(field.name)
      const options = field.optionsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((value) => ({ value, label: value }))

      return {
        id: field.id,
        key,
        name: field.name.trim(),
        field_type: field.field_type,
        is_required: field.is_required,
        options,
      }
    })

    const result = await saveCustomFieldDefinitions(normalized)

    if (result.error) {
      toast.error(isEn ? 'Failed to save custom fields' : 'Gagal menyimpan custom fields', {
        description: result.error,
      })
      setIsSaving(false)
      return
    }

    toast.success(isEn ? 'Custom fields saved' : 'Custom fields berhasil disimpan')
    setIsSaving(false)
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Custom Fields
        </CardTitle>
        <CardDescription>
          {isEn
            ? 'Add custom fields without coding. These fields automatically appear in create/edit task forms.'
            : 'Tambahkan field custom tanpa coding. Field ini otomatis muncul di form create/edit task.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {isEn ? 'No custom fields yet. Click the button below to add one.' : 'Belum ada custom field. Klik tombol di bawah untuk menambahkan.'}
          </div>
        )}

        {fields.map((field, index) => {
          const useOptions = field.field_type === 'select' || field.field_type === 'multi-select'

          return (
            <div key={`${field.id ?? 'new'}-${index}`} className="p-4 rounded-lg border border-border/50 bg-muted/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">{isEn ? 'Field Name' : 'Nama Field'}</label>
                  <Input
                    value={field.name}
                    onChange={(e) => updateField(index, 'name', e.target.value)}
                    placeholder={isEn ? 'Example: Talent Name' : 'Contoh: Nama Talent'}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">{isEn ? 'Key (optional)' : 'Key (opsional)'}</label>
                  <Input
                    value={field.key}
                    onChange={(e) => updateField(index, 'key', toKey(e.target.value))}
                    placeholder="talent_name"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">{isEn ? 'Field Type' : 'Tipe Data'}</label>
                  <Select
                    value={field.field_type}
                    onValueChange={(value) => updateField(index, 'field_type', value as CustomFieldType)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                      <SelectItem value="multi-select">Multi Select</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {useOptions && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5" />
                    {isEn ? 'Options (comma-separated)' : 'Opsi (pisahkan dengan koma)'}
                  </label>
                  <Input
                    value={field.optionsText}
                    onChange={(e) => updateField(index, 'optionsText', e.target.value)}
                    placeholder={isEn ? 'example: Draft, Production, Publish' : 'contoh: Draft, Produksi, Publish'}
                    className="bg-background"
                  />
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`required-${index}`}
                    checked={field.is_required}
                    onCheckedChange={(checked) => updateField(index, 'is_required', !!checked)}
                  />
                  <label htmlFor={`required-${index}`} className="text-sm text-muted-foreground cursor-pointer">
                    {isEn ? 'Required field' : 'Wajib diisi'}
                  </label>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
      <CardFooter className="bg-muted/10 border-t border-border/50 py-4 flex flex-col sm:flex-row justify-between gap-3">
        <Button variant="outline" className="border-dashed border-primary/50 text-primary hover:bg-primary/5" onClick={addField}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {isEn ? 'Add New Field' : 'Tambah Field Baru'}
        </Button>
        <Button className="shadow-sm" onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEn ? 'Save Changes' : 'Simpan Perubahan'}
        </Button>
      </CardFooter>
    </Card>
  )
}
