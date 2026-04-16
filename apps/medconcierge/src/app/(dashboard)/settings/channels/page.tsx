'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  MessageCircle,
  Send,
  MessageSquare,
  Camera,
  Globe,
  Phone,
  Loader2,
  Save,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelConfig {
  enabled: boolean;
  config?: Record<string, string>;
}

type ChannelsConfig = Record<string, ChannelConfig>;

interface ChannelDefinition {
  key: string;
  name: string;
  description: string;
  icon: React.ElementType;
  fields: FieldDefinition[];
}

interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'password' | 'color' | 'textarea';
  placeholder?: string;
  readonly?: boolean;
  defaultValue?: string;
}

// ---------------------------------------------------------------------------
// Channel definitions
// ---------------------------------------------------------------------------

const CHANNELS: ChannelDefinition[] = [
  {
    key: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Mensajeria directa con clientes',
    icon: MessageCircle,
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: 'Ej: 123456789012345' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Tu token de acceso de WhatsApp Business API' },
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        type: 'text',
        readonly: true,
        defaultValue: '/api/webhooks/whatsapp',
      },
    ],
  },
  {
    key: 'telegram',
    name: 'Telegram',
    description: 'Bot de Telegram',
    icon: Send,
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'Token de tu bot de BotFather' },
    ],
  },
  {
    key: 'messenger',
    name: 'Facebook Messenger',
    description: 'Mensajes de Facebook',
    icon: MessageSquare,
    fields: [
      { key: 'page_access_token', label: 'Page Access Token', type: 'password', placeholder: 'Token de acceso de tu pagina de Facebook' },
    ],
  },
  {
    key: 'instagram',
    name: 'Instagram',
    description: 'DMs de Instagram',
    icon: Camera,
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Token de acceso de Instagram API' },
    ],
  },
  {
    key: 'webchat',
    name: 'Chat Web',
    description: 'Widget para tu pagina web',
    icon: Globe,
    fields: [
      { key: 'color', label: 'Color del Widget', type: 'color', defaultValue: '#4f46e5' },
      {
        key: 'embed_code',
        label: 'Codigo de Integracion',
        type: 'textarea',
        readonly: true,
        defaultValue: '<script src="https://app.auctorum.ai/widget.js" data-tenant="TU_TENANT_ID"></script>',
      },
    ],
  },
  {
    key: 'calls',
    name: 'Llamadas',
    description: 'IA por telefono via Twilio',
    icon: Phone,
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'Twilio Account SID' },
      { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: 'Twilio Auth Token' },
      { key: 'phone_number', label: 'Phone Number', type: 'text', placeholder: '+52...' },
    ],
  },
  {
    key: 'sms',
    name: 'SMS',
    description: 'Chatbot por SMS via Twilio',
    icon: MessageSquare,
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'Twilio Account SID' },
      { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: 'Twilio Auth Token' },
      { key: 'phone_number', label: 'Phone Number', type: 'text', placeholder: '+52...' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChannelsSettingsPage() {
  const [channelsConfig, setChannelsConfig] = useState<ChannelsConfig>({});
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Fetch ----
  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/settings/channels');
      if (!res.ok) throw new Error('Error al cargar canales');
      const data = await res.json();
      setChannelsConfig(data.channelsConfig ?? {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // ---- Handlers ----

  const toggleChannel = (key: string) => {
    setChannelsConfig((prev) => {
      const current = prev[key] ?? { enabled: false, config: {} };
      const next = { ...current, enabled: !current.enabled };
      return { ...prev, [key]: next };
    });

    // Auto-expand when enabling
    setExpandedChannels((prev) => {
      const current = channelsConfig[key];
      if (!current?.enabled) {
        return { ...prev, [key]: true };
      }
      return prev;
    });
  };

  const toggleExpand = (key: string) => {
    setExpandedChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = (channelKey: string, fieldKey: string, value: string) => {
    setChannelsConfig((prev) => {
      const current = prev[channelKey] ?? { enabled: false, config: {} };
      return {
        ...prev,
        [channelKey]: {
          ...current,
          config: { ...(current.config ?? {}), [fieldKey]: value },
        },
      };
    });
  };

  const isConfigured = (channelKey: string): boolean => {
    const ch = channelsConfig[channelKey];
    if (!ch?.enabled) return false;
    const def = CHANNELS.find((c) => c.key === channelKey);
    if (!def) return false;
    const editableFields = def.fields.filter((f) => !f.readonly);
    if (editableFields.length === 0) return true;
    return editableFields.every((f) => {
      const val = ch.config?.[f.key];
      return val !== undefined && val !== '';
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/dashboard/settings/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelsConfig }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al guardar');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
          <Radio className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canales de Comunicacion</h1>
          <p className="text-sm text-gray-500">Configura los canales por los que interactuas con tus clientes</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Channel cards */}
      <div className="space-y-4">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const ch = channelsConfig[channel.key];
          const enabled = ch?.enabled ?? false;
          const configured = isConfigured(channel.key);
          const expanded = expandedChannels[channel.key] ?? false;

          return (
            <div
              key={channel.key}
              className="rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Channel header row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      enabled ? 'bg-indigo-50' : 'bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${enabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{channel.name}</span>
                      {enabled && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            configured
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {configured ? 'Configurado' : 'No configurado'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{channel.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Toggle switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => toggleChannel(channel.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      enabled ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  {/* Expand/collapse button */}
                  {enabled && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(channel.key)}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    >
                      {expanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable config section */}
              {enabled && expanded && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <div className="space-y-4">
                    {channel.fields.map((field) => {
                      const value =
                        ch?.config?.[field.key] ?? field.defaultValue ?? '';

                      if (field.type === 'textarea') {
                        return (
                          <div key={field.key}>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              {field.label}
                            </label>
                            <textarea
                              rows={3}
                              readOnly={field.readonly}
                              value={value}
                              onChange={(e) =>
                                !field.readonly &&
                                updateField(channel.key, field.key, e.target.value)
                              }
                              className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono ${
                                field.readonly
                                  ? 'cursor-default bg-gray-50 text-gray-500'
                                  : 'bg-white text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                              }`}
                            />
                          </div>
                        );
                      }

                      if (field.type === 'color') {
                        return (
                          <div key={field.key}>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              {field.label}
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={value || '#4f46e5'}
                                onChange={(e) =>
                                  updateField(channel.key, field.key, e.target.value)
                                }
                                className="h-10 w-14 cursor-pointer rounded-lg border border-gray-200"
                              />
                              <span className="text-sm text-gray-500 font-mono">
                                {value || '#4f46e5'}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={field.key}>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            readOnly={field.readonly}
                            value={value}
                            placeholder={field.placeholder}
                            onChange={(e) =>
                              !field.readonly &&
                              updateField(channel.key, field.key, e.target.value)
                            }
                            className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm ${
                              field.readonly
                                ? 'cursor-default bg-gray-50 text-gray-500 font-mono'
                                : 'bg-white text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
