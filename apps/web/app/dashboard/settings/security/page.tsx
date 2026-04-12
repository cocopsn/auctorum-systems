'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  Loader2,
  KeyRound,
  Copy,
  CheckCircle2,
  XCircle,
  Monitor,
} from 'lucide-react';

export default function SecuritySettingsPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enable flow state
  const [enabling, setEnabling] = useState(false);
  const [enableLoading, setEnableLoading] = useState(false);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [secretDisplay, setSecretDisplay] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Disable flow state
  const [disabling, setDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  // ---- Fetch status ----
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/settings/security', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar estado de seguridad');
      const data = await res.json();
      setTwoFactorEnabled(data.twoFactorEnabled);
      setVerifiedAt(data.verifiedAt);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ---- Enable 2FA ----
  const handleStartEnable = async () => {
    try {
      setEnableLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/settings/security/2fa/enable', {
        credentials: 'include',
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al activar 2FA');
      }
      const data = await res.json();
      setOtpauthUri(data.otpauthUri);
      setSecretDisplay(data.secret);
      setEnabling(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnableLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setError(null);
      const res = await fetch('/api/dashboard/settings/security/2fa/verify', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al verificar');
      }
      // Success
      setTwoFactorEnabled(true);
      setVerifiedAt(new Date().toISOString());
      setEnabling(false);
      setOtpauthUri(null);
      setSecretDisplay(null);
      setVerifyCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  // ---- Disable 2FA ----
  const handleDisable = async () => {
    try {
      setDisableLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard/settings/security/2fa/disable', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Error al desactivar');
      }
      setTwoFactorEnabled(false);
      setVerifiedAt(null);
      setDisabling(false);
      setDisableCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDisableLoading(false);
    }
  };

  const handleCopyUri = async () => {
    if (!otpauthUri) return;
    try {
      await navigator.clipboard.writeText(otpauthUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
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
          <Shield className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seguridad</h1>
          <p className="text-sm text-gray-500">Administra la seguridad de tu cuenta</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 2FA Section */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <KeyRound className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Autenticacion de dos factores
            </h2>
          </div>

          {/* --- 2FA NOT ENABLED --- */}
          {!twoFactorEnabled && !enabling && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-4">
                Agrega una capa extra de seguridad a tu cuenta. Al activar 2FA, necesitaras un
                codigo de tu aplicacion autenticadora cada vez que inicies sesion.
              </p>
              <button
                onClick={handleStartEnable}
                disabled={enableLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {enableLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Activar 2FA
              </button>
            </div>
          )}

          {/* --- Enabling flow (secret + verify) --- */}
          {!twoFactorEnabled && enabling && (
            <div className="mt-4 space-y-5">
              <p className="text-sm text-gray-600">
                Escanea este URI en tu aplicacion autenticadora (Google Authenticator, Authy, etc.)
                o copialo manualmente:
              </p>

              {/* OTPAuth URI box */}
              <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">OTPAuth URI</p>
                <p className="text-sm font-mono break-all text-gray-800 pr-8">
                  {otpauthUri}
                </p>
                <button
                  onClick={handleCopyUri}
                  className="absolute top-4 right-4 rounded-md p-1 text-gray-400 hover:text-gray-600"
                  title="Copiar"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Secret key display */}
              {secretDisplay && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-1">Clave secreta (Base32)</p>
                  <p className="text-sm font-mono tracking-wider text-gray-800">
                    {secretDisplay}
                  </p>
                </div>
              )}

              {/* Verification code input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codigo de verificacion
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Ingresa el codigo de 6 digitos de tu aplicacion autenticadora
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-center text-lg font-mono tracking-widest focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleVerify}
                    disabled={verifying || verifyCode.length !== 6}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verificar y activar
                  </button>
                </div>
              </div>

              {/* Cancel */}
              <button
                onClick={() => {
                  setEnabling(false);
                  setOtpauthUri(null);
                  setSecretDisplay(null);
                  setVerifyCode('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* --- 2FA ENABLED --- */}
          {twoFactorEnabled && !disabling && (
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  2FA Activo
                </span>
                {verifiedAt && (
                  <span className="text-sm text-gray-500">
                    Activado el{' '}
                    {new Date(verifiedAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Tu cuenta esta protegida con autenticacion de dos factores.
              </p>
              <button
                onClick={() => setDisabling(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Desactivar 2FA
              </button>
            </div>
          )}

          {/* --- Disabling flow --- */}
          {twoFactorEnabled && disabling && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-gray-600">
                Para desactivar 2FA, ingresa el codigo actual de tu aplicacion autenticadora.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-center text-lg font-mono tracking-widest focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleDisable}
                  disabled={disableLoading || disableCode.length !== 6}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {disableLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar desactivacion
                </button>
              </div>
              <button
                onClick={() => {
                  setDisabling(false);
                  setDisableCode('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active sessions section — placeholder */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <Monitor className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Sesiones activas</h2>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
            <Monitor className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500">
              Administra tus sesiones activas
            </p>
            <p className="text-xs text-gray-400 mt-1">Proximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
