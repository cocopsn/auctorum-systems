// @ts-nocheck
'use client'
// AuctorumLanding.tsx — single-scene landing (canvas + scroll-driven camera).
// Adapted verbatim from AUCTORUM Design System (ui_kits/marketing/NeuralScene.jsx).
// @ts-nocheck because the body is 1290 lines of canvas math with implicit
// any types throughout; type-checking the React shell adds no real safety here.

import React, { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// ============================================================
// HUBS — story-bearing nodes. The camera path flies between
// these. Coordinates are in "world" space (roughly -1800..1800).
// ============================================================
const HUBS = [
  { id: 0, x:     0, y:     0, label: "GENESIS",    kind: "origin" },
  { id: 1, x: -1100, y:  -520, label: "MED",        kind: "branch" },
  { id: 2, x:  1200, y:   380, label: "AI",         kind: "branch" },
  { id: 3, x:  1050, y:  -640, label: "ACOPLE",     kind: "branch" },
  { id: 4, x: -1280, y:   620, label: "FUTURO",     kind: "branch" },
  { id: 5, x:     0, y:     0, label: "MANIFIESTO", kind: "center" },
];

// ============================================================
// HUB MOTIFS — drawn natively into the main canvas around each
// hub's projected screen position. Same line/glow vocabulary as
// the rest of the graph: cobalt strokes, soft halos, no boxes.
// Signature: (ctx, screenPos, zoom, tSec, intensity 0..1)
// ============================================================
function motifLineColor(a) { return `rgba(140, 180, 240, ${a.toFixed(3)})`; }
function motifHotColor(a)  { return `rgba(220, 235, 255, ${a.toFixed(3)})`; }
function motifAccent(a)    { return `rgba(120, 175, 255, ${a.toFixed(3)})`; }

const HUB_MOTIFS = {
  // ============================================================
  // 1) MED — clinical instrument vignette.
  // ECG trace + vital-signs panel labels + crosshair reticle on
  // the hub. Reads as a medical monitor.
  // ============================================================
  1: function (ctx, p, zoom, t, k) {
    const W = 480 * (0.7 + zoom * 1.0);
    const H = 230 * (0.7 + zoom * 1.0);
    const xL = p.x - W / 2;
    const xR = p.x + W / 2;
    const yT = p.y - H / 2;
    const yB = p.y + H / 2;
    ctx.lineCap = 'round';

    // ---- Frame corners (subtle, instrument-style) ----
    const cornerL = 14;
    ctx.strokeStyle = motifLineColor(0.45 * k);
    ctx.lineWidth = 1.1;
    drawCornerTicks(ctx, xL, yT, xR, yB, cornerL);

    // ---- Lead labels (top row, monospace feel via fixed-width strokes) ----
    drawHudText(ctx, xL + 4, yT - 6, 'ECG · LEAD II', 0.6 * k);
    drawHudText(ctx, xR - 80, yT - 6, '76 BPM · LIVE', 0.6 * k);

    // ---- Soft horizontal grid behind the trace ----
    ctx.strokeStyle = motifLineColor(0.10 * k);
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const yy = yT + (H * 0.65) * i / 4;
      ctx.beginPath(); ctx.moveTo(xL, yy); ctx.lineTo(xR, yy); ctx.stroke();
    }

    // ---- ECG trace — runs across full width, with QRS spike ----
    const traceMid = yT + H * 0.32;
    const speed = 130;
    const offset = (t * speed) % W;
    ctx.strokeStyle = motifLineColor(0.78 * k);
    ctx.lineWidth = 1.55;
    ctx.beginPath();
    const beatGap = W * 0.42;
    let started = false;
    for (let x = 0; x <= W; x += 1) {
      const vx = (x + offset) % W;
      const phase = (vx % beatGap) / beatGap;
      let y = traceMid;
      if (phase > 0.42 && phase < 0.55) {
        y -= Math.sin((phase - 0.42) / 0.13 * Math.PI) * 5;
      } else if (phase > 0.58 && phase < 0.74) {
        const p2 = (phase - 0.58) / 0.16;
        if (p2 < 0.18)        y += 4;
        else if (p2 < 0.45)   y -= 42 * (1 - Math.abs(p2 - 0.32) / 0.14);
        else if (p2 < 0.7)    y += 14 * (1 - Math.abs(p2 - 0.55) / 0.15);
      } else if (phase > 0.78 && phase < 0.93) {
        y -= Math.sin((phase - 0.78) / 0.15 * Math.PI) * 11;
      } else {
        y += Math.sin(vx * 0.6 + t * 4) * 0.5;
      }
      const xs = xL + x;
      if (!started) { ctx.moveTo(xs, y); started = true; }
      else ctx.lineTo(xs, y);
    }
    ctx.stroke();

    // ---- "Now" cursor at right edge of trace ----
    ctx.fillStyle = motifHotColor(0.95 * k);
    ctx.beginPath(); ctx.arc(xR - 1, traceMid, 2.6, 0, Math.PI * 2); ctx.fill();
    const halo = ctx.createRadialGradient(xR - 1, traceMid, 0, xR - 1, traceMid, 18);
    halo.addColorStop(0, motifAccent(0.55 * k));
    halo.addColorStop(1, motifAccent(0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(xR - 1, traceMid, 18, 0, Math.PI * 2); ctx.fill();

    // ---- Vital signs panel (lower half) ----
    const panelY = yT + H * 0.55;
    const panelH = H * 0.42;
    // Three columns: HR, SpO2, BP
    const cols = [
      { label: 'HR',   value: '76',   unit: 'BPM',  bar: 0.62 + Math.sin(t * 1.2) * 0.06 },
      { label: 'SpO₂', value: '98',   unit: '%',    bar: 0.92 + Math.sin(t * 0.6) * 0.02 },
      { label: 'BP',   value: '118',  unit: 'mmHg', bar: 0.55 + Math.sin(t * 0.8) * 0.04 },
    ];
    const colW = W / cols.length;
    cols.forEach((c, i) => {
      const cx = xL + i * colW + 12;
      const yy = panelY + 18;
      drawHudText(ctx, cx, yy, c.label, 0.5 * k);
      // Big value (drawn as a stylized rectangle for legibility)
      drawHudText(ctx, cx, yy + 28, c.value, 0.95 * k, 18);
      drawHudText(ctx, cx + 36, yy + 28, c.unit, 0.55 * k, 9);
      // Vertical bar gauge
      const bw = 4;
      const bx = cx + 64;
      const bh = panelH * 0.55;
      const by = yy + 12;
      ctx.strokeStyle = motifLineColor(0.25 * k);
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bx, by, bw, bh);
      const fill = bh * c.bar;
      ctx.fillStyle = motifAccent(0.65 * k);
      ctx.fillRect(bx, by + bh - fill, bw, fill);
    });

    // ---- Crosshair reticle on the hub itself ----
    const rR = 26 * (0.8 + zoom * 0.6);
    ctx.strokeStyle = motifLineColor(0.55 * k);
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(p.x, p.y, rR, 0, Math.PI * 2); ctx.stroke();
    // tick marks
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      const x1 = p.x + Math.cos(a) * (rR - 4);
      const y1 = p.y + Math.sin(a) * (rR - 4);
      const x2 = p.x + Math.cos(a) * (rR + 4);
      const y2 = p.y + Math.sin(a) * (rR + 4);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  },

  // ============================================================
  // 2) AUCTORUM AI — sovereign local-server architecture.
  // Hardware chassis (left) → model swarm with hot-swap into GPU
  // → WhatsApp interface (right) + integrations strip + AGPL seal.
  // Reads unmistakably as: local AI, your hardware, your data,
  // talks to you on WhatsApp, integrates with the tools you use.
  // ============================================================
  2: function (ctx, p, zoom, t, k) {
    const W = 580 * (0.7 + zoom * 1.0);
    const H = 280 * (0.7 + zoom * 1.0);
    const xL = p.x - W / 2;
    const xR = p.x + W / 2;
    const yT = p.y - H / 2;
    const yB = p.y + H / 2;
    ctx.lineCap = 'round';

    // ---- Frame ticks + labels ----
    ctx.strokeStyle = motifLineColor(0.45 * k);
    ctx.lineWidth = 1.1;
    drawCornerTicks(ctx, xL, yT, xR, yB, 14);
    drawHudText(ctx, xL + 4, yT - 6, 'AUCTORUM · NODE SOBERANO · LIVE', 0.65 * k);
    drawHudText(ctx, xR - 110, yT - 6, 'AGPL-3.0 · CERN OHL-S', 0.6 * k);

    // ============================================================
    // LEFT — hardware chassis
    // ============================================================
    const chW = W * 0.30;
    const chH = H * 0.62;
    const chX = xL + 16;
    const chY = yT + 28;
    // Chassis outline (server box)
    ctx.strokeStyle = motifLineColor(0.7 * k);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(chX, chY, chW, chH);
    // Inner divider — CPU section / GPU section
    const cpuY = chY + 18;
    const cpuH = chH * 0.35;
    const gpuY = cpuY + cpuH + 8;
    const gpuH = chH - cpuH - 26;
    // CPU slot
    ctx.strokeStyle = motifLineColor(0.45 * k);
    ctx.lineWidth = 0.9;
    ctx.strokeRect(chX + 8, cpuY, chW - 16, cpuH);
    drawHudText(ctx, chX + 12, cpuY - 3, 'CPU · i3-7100', 0.55 * k, 8);
    // CPU activity bars
    for (let i = 0; i < 8; i++) {
      const bx = chX + 14 + i * ((chW - 28) / 8);
      const bh = 4 + Math.abs(Math.sin(t * 1.4 + i * 0.5)) * (cpuH - 12);
      ctx.fillStyle = motifAccent(0.55 * k);
      ctx.fillRect(bx, cpuY + cpuH - 4 - bh, 4, bh);
    }
    // GPU slot — this is where models hot-swap into
    ctx.strokeStyle = motifLineColor(0.7 * k);
    ctx.lineWidth = 1.0;
    ctx.strokeRect(chX + 8, gpuY, chW - 16, gpuH);
    drawHudText(ctx, chX + 12, gpuY - 3, 'GPU · GTX 1070 · 8GB', 0.6 * k, 8);
    // VRAM utilization bar
    const vramFrac = 0.62 + Math.sin(t * 0.8) * 0.10;
    const vbX = chX + 14;
    const vbY = gpuY + gpuH - 10;
    const vbW = chW - 28;
    ctx.strokeStyle = motifLineColor(0.45 * k);
    ctx.strokeRect(vbX, vbY, vbW, 4);
    ctx.fillStyle = motifAccent(0.75 * k);
    ctx.fillRect(vbX, vbY, vbW * vramFrac, 4);
    // Loaded-model name (rotates through 3 swarm models)
    const swarm = ['Qwen3:8B-16K', 'Tools:4B', 'Reason:14B'];
    const idx = Math.floor(t * 0.5) % swarm.length;
    drawHudText(ctx, chX + 14, gpuY + gpuH * 0.5, swarm[idx], 0.85 * k, 9);
    // OS line
    drawHudText(ctx, chX + 12, chY + chH + 10, 'UBUNTU 24.04 · OLLAMA 0.18.3', 0.5 * k, 8);
    // System status row at top
    drawHudText(ctx, chX + 12, chY + 12, 'NODE · ONLINE', 0.7 * k, 8);
    // pulsing online dot
    const dotPulse = 0.6 + 0.4 * Math.sin(t * 2.5);
    ctx.fillStyle = motifHotColor(0.95 * dotPulse * k);
    ctx.beginPath(); ctx.arc(chX + chW - 14, chY + 12, 2.2, 0, Math.PI * 2); ctx.fill();

    // ============================================================
    // CENTER — model swarm with hot-swap arrows pointing at GPU
    // ============================================================
    const swarmX = chX + chW + 24;
    const swarmW = W * 0.22;
    const slotH = 22;
    const slotGap = 8;
    const totalSlotsH = 3 * slotH + 2 * slotGap;
    const slotsY = p.y - totalSlotsH / 2;
    const swarmModels = [
      { label: 'CLASSIFY · 0.8B', tag: 'fast' },
      { label: 'TOOLS · 4B',       tag: 'mid'  },
      { label: 'REASON · 14B',     tag: 'deep' },
    ];
    // Active slot rotates with time
    const activeSlot = Math.floor(t * 0.5) % 3;
    swarmModels.forEach((m, i) => {
      const sy = slotsY + i * (slotH + slotGap);
      const isActive = i === activeSlot;
      ctx.strokeStyle = motifLineColor((isActive ? 0.85 : 0.40) * k);
      ctx.lineWidth = isActive ? 1.3 : 0.9;
      ctx.strokeRect(swarmX, sy, swarmW, slotH);
      if (isActive) {
        ctx.fillStyle = motifAccent(0.20 * k);
        ctx.fillRect(swarmX + 1, sy + 1, swarmW - 2, slotH - 2);
      }
      drawHudText(ctx, swarmX + 8, sy + slotH / 2 + 3, m.label, (isActive ? 0.95 : 0.55) * k, 9);
      // Hot-swap arrow from active slot → GPU slot center
      if (isActive) {
        const ax1 = swarmX;                                    // start at left of active swarm slot
        const ay1 = sy + slotH / 2;
        const ax2 = chX + chW;                                 // end at right edge of chassis (GPU enters here)
        const ay2 = gpuY + gpuH / 2;
        // Pulsing arrow
        const ph = (t * 1.2) % 1;
        ctx.strokeStyle = motifAccent(0.7 * k);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -t * 18;
        ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        // arrowhead
        const arrAng = Math.atan2(ay2 - ay1, ax2 - ax1);
        ctx.fillStyle = motifHotColor(0.95 * k);
        ctx.beginPath();
        ctx.moveTo(ax2, ay2);
        ctx.lineTo(ax2 - Math.cos(arrAng - 0.4) * 7, ay2 - Math.sin(arrAng - 0.4) * 7);
        ctx.lineTo(ax2 - Math.cos(arrAng + 0.4) * 7, ay2 - Math.sin(arrAng + 0.4) * 7);
        ctx.closePath();
        ctx.fill();
      }
    });
    drawHudText(ctx, swarmX, slotsY - 8, 'SWARM · HOT-SWAP', 0.55 * k, 8);

    // ============================================================
    // RIGHT — WhatsApp conversation surface
    // ============================================================
    const waX = swarmX + swarmW + 26;
    const waW = xR - waX - 16;
    const waH = H * 0.62;
    const waY = yT + 28;
    // WA window outline
    ctx.strokeStyle = motifLineColor(0.7 * k);
    ctx.lineWidth = 1.1;
    ctx.strokeRect(waX, waY, waW, waH);
    // Header strip
    ctx.fillStyle = motifLineColor(0.18 * k);
    ctx.fillRect(waX, waY, waW, 14);
    drawHudText(ctx, waX + 8, waY + 10, 'WHATSAPP · AUCTORUM', 0.75 * k, 8);
    // Tailscale lock indicator (zero-trust)
    drawHudText(ctx, waX + waW - 60, waY + 10, '🔒 TAILSCALE', 0.55 * k, 7);
    // Bubbles — alternating user/agent
    const bubbleAreaY = waY + 22;
    const bubbleAreaH = waH - 26;
    const bubbles = [
      { who: 'me',    w: 0.55, h: 12 },
      { who: 'agent', w: 0.78, h: 22 },
      { who: 'me',    w: 0.40, h: 10 },
      { who: 'agent', w: 0.68, h: 18 },
    ];
    let by = bubbleAreaY + 4;
    bubbles.forEach((b, i) => {
      const bw = waW * b.w * 0.85;
      const bh = b.h;
      const bx = b.who === 'me' ? (waX + waW - bw - 8) : (waX + 8);
      // Stagger appearance with time
      const appearPhase = ((t * 0.4) + i * 0.25) % 4;
      if (appearPhase >= 0 && by + bh < waY + waH - 4) {
        ctx.fillStyle = b.who === 'me' ? motifAccent(0.45 * k) : motifLineColor(0.20 * k);
        ctx.strokeStyle = motifLineColor(0.55 * k);
        ctx.lineWidth = 0.7;
        roundRect(ctx, bx, by, bw, bh, 4);
        ctx.fill();
        ctx.stroke();
        // Text shimmer (faint dashes inside the bubble)
        ctx.fillStyle = motifLineColor(0.55 * k);
        const lines = bh > 14 ? 2 : 1;
        for (let l = 0; l < lines; l++) {
          ctx.fillRect(bx + 6, by + 4 + l * 7, bw - 12 - (l === lines - 1 ? 14 : 0), 1.4);
        }
      }
      by += bh + 4;
    });

    // ============================================================
    // BOTTOM — integrations strip
    // ============================================================
    const intY = yT + H - 28;
    const intLabels = ['GMAIL', 'CALENDAR', 'GITHUB', 'SPOTIFY', 'SQLITE', 'OPENROUTER'];
    const intXStart = xL + 16;
    const intStep = (W - 32) / intLabels.length;
    drawHudText(ctx, intXStart, intY - 8, 'INTEGRATIONS', 0.55 * k, 8);
    intLabels.forEach((lbl, i) => {
      const ix = intXStart + i * intStep;
      // Pulse one integration at a time
      const isPulse = Math.floor(t * 1.4) % intLabels.length === i;
      ctx.strokeStyle = motifLineColor((isPulse ? 0.9 : 0.40) * k);
      ctx.lineWidth = isPulse ? 1.2 : 0.8;
      ctx.strokeRect(ix, intY, intStep - 8, 14);
      if (isPulse) {
        ctx.fillStyle = motifAccent(0.30 * k);
        ctx.fillRect(ix + 1, intY + 1, intStep - 10, 12);
      }
      drawHudText(ctx, ix + 6, intY + 10, lbl, (isPulse ? 0.95 : 0.55) * k, 7);
    });
  },

  // ============================================================
  // 3) ACOPLE — marketplace of two industrial clusters.
  // Two grids of company-cards (small rectangles) on either side
  // of the hub; bridge filaments carry transaction pulses through
  // the central hub. Reads as B2B graph commerce.
  // ============================================================
  3: function (ctx, p, zoom, t, k) {
    const W = 540 * (0.7 + zoom * 1.0);
    const H = 220 * (0.7 + zoom * 1.0);
    const xL = p.x - W / 2;
    const xR = p.x + W / 2;
    const yT = p.y - H / 2;
    const yB = p.y + H / 2;
    ctx.lineCap = 'round';

    // ---- Frame ticks ----
    ctx.strokeStyle = motifLineColor(0.45 * k);
    ctx.lineWidth = 1.1;
    drawCornerTicks(ctx, xL, yT, xR, yB, 14);
    drawHudText(ctx, xL + 4, yT - 6, 'B2B · COUPLING', 0.6 * k);
    drawHudText(ctx, xR - 70, yT - 6, 'TX · STREAMING', 0.6 * k);

    // ---- Two grids of company-cards (3×3 each) ----
    const gridCols = 3, gridRows = 3;
    const cardW = 36, cardH = 14;
    const gx = 12, gy = 18;
    function drawGrid(originX, originY, fillIdx, mirror) {
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const cIdx = mirror ? gridCols - 1 - c : c;
          const x = originX + c * (cardW + gx);
          const y = originY + r * (cardH + gy);
          // Card outline
          ctx.strokeStyle = motifLineColor(0.45 * k);
          ctx.lineWidth = 0.9;
          ctx.strokeRect(x, y, cardW, cardH);
          // Card "pulse" — random card highlights
          const idx = r * gridCols + cIdx;
          const phase = ((t * 0.6) + idx * 0.13) % 2;
          if (phase < 0.6) {
            const fade = Math.sin(phase / 0.6 * Math.PI);
            ctx.fillStyle = motifAccent(0.5 * fade * k);
            ctx.fillRect(x + 1, y + 1, cardW - 2, cardH - 2);
          }
          // Tier dot (small status indicator)
          ctx.fillStyle = motifLineColor(0.7 * k);
          ctx.beginPath(); ctx.arc(x + cardW - 4, y + cardH / 2, 1.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    const leftOrigin = xL + 14;
    const rightOrigin = xR - 14 - (gridCols * cardW + (gridCols - 1) * gx);
    const gridY = yT + 22;
    drawGrid(leftOrigin, gridY, 0, false);
    drawGrid(rightOrigin, gridY, 1, true);

    // ---- Bridge filaments through center (transaction lanes) ----
    // Pick edge cards from left and right sides at varying rows
    const lanes = 5;
    for (let i = 0; i < lanes; i++) {
      const rowL = Math.floor(i * gridRows / lanes);
      const rowR = (rowL + 1) % gridRows;
      const x1 = leftOrigin + (gridCols - 1) * (cardW + gx) + cardW;
      const y1 = gridY + rowL * (cardH + gy) + cardH / 2;
      const x2 = rightOrigin;
      const y2 = gridY + rowR * (cardH + gy) + cardH / 2;
      // Curve through hub
      const cx = p.x;
      const cy = p.y - 4 + Math.sin(t * 0.7 + i) * 6;
      ctx.strokeStyle = motifAccent(0.42 * k);
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
      // Transaction pulse (in either direction, alternating)
      const dir = i % 2 === 0 ? 1 : -1;
      const phRaw = (t * 0.55 + i * 0.18) % 1;
      const ph = dir > 0 ? phRaw : (1 - phRaw);
      const inv = 1 - ph;
      const px = inv * inv * x1 + 2 * inv * ph * cx + ph * ph * x2;
      const py = inv * inv * y1 + 2 * inv * ph * cy + ph * ph * y2;
      const intensity = Math.sin(phRaw * Math.PI);
      ctx.fillStyle = motifHotColor(0.92 * intensity * k);
      ctx.beginPath(); ctx.arc(px, py, 1.7, 0, Math.PI * 2); ctx.fill();
    }

    // ---- Hub center: a small "exchange" diamond ----
    ctx.strokeStyle = motifLineColor(0.7 * k);
    ctx.lineWidth = 1.0;
    const dR = 8;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - dR);
    ctx.lineTo(p.x + dR, p.y);
    ctx.lineTo(p.x, p.y + dR);
    ctx.lineTo(p.x - dR, p.y);
    ctx.closePath();
    ctx.stroke();
  },

  // ============================================================
  // 4) HORIZONTE — architectural compass + dendrite forecast.
  // Concentric arc rings (0/30/60/90/180/270 degree marks like
  // a compass), plus a real dendrite tree growing outward, plus
  // four dim placeholder nodes ("incubation slots") at quadrants.
  // ============================================================
  4: function (ctx, p, zoom, t, k) {
    const baseR = 130 * (0.7 + zoom * 0.9);
    ctx.lineCap = 'round';

    // ---- Outer compass ring with degree marks ----
    ctx.strokeStyle = motifLineColor(0.45 * k);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, baseR, 0, Math.PI * 2);
    ctx.stroke();
    // Inner ring
    ctx.strokeStyle = motifLineColor(0.25 * k);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(p.x, p.y, baseR * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    // Degree ticks (24 ticks; major every 6th)
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2 - Math.PI / 2;
      const major = i % 6 === 0;
      const tickL = major ? 12 : 6;
      const x1 = p.x + Math.cos(a) * (baseR - tickL);
      const y1 = p.y + Math.sin(a) * (baseR - tickL);
      const x2 = p.x + Math.cos(a) * baseR;
      const y2 = p.y + Math.sin(a) * baseR;
      ctx.strokeStyle = motifLineColor((major ? 0.75 : 0.35) * k);
      ctx.lineWidth = major ? 1.2 : 0.7;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // Cardinal labels
    drawHudText(ctx, p.x - 4, p.y - baseR - 10, 'N', 0.7 * k, 9);
    drawHudText(ctx, p.x + baseR + 6, p.y + 3, 'E', 0.7 * k, 9);
    drawHudText(ctx, p.x - 4, p.y + baseR + 14, 'S', 0.7 * k, 9);
    drawHudText(ctx, p.x - baseR - 14, p.y + 3, 'O', 0.7 * k, 9);

    // ---- Dendrite tree growing outward, looping ----
    const period = 8;
    const tt = (t % period) / period;
    const reveal = Math.min(1, tt * 1.05);
    const branches = motifBuildTree(p.x, p.y, zoom);
    const limit = Math.floor(reveal * branches.length);
    for (let i = 0; i < limit && i < branches.length; i++) {
      const b = branches[i];
      const fresh = Math.max(0, 1 - (limit - i) / 8);
      ctx.strokeStyle = motifLineColor((0.45 + fresh * 0.45) * k);
      ctx.lineWidth = b.w + fresh * 0.7;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.quadraticCurveTo(b.cx, b.cy, b.x2, b.y2);
      ctx.stroke();
      if (fresh > 0.3) {
        ctx.fillStyle = motifHotColor(0.9 * fresh * k);
        ctx.beginPath(); ctx.arc(b.x2, b.y2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ---- Four "incubation slots" — empty outline circles at compass points ----
    const slotR = 8;
    [
      { ang: -Math.PI / 4, label: 'IN-01' },
      { ang:  Math.PI / 4, label: 'IN-02' },
      { ang:  Math.PI * 3 / 4, label: 'IN-03' },
      { ang: -Math.PI * 3 / 4, label: 'IN-04' },
    ].forEach((s) => {
      const sx = p.x + Math.cos(s.ang) * baseR * 1.18;
      const sy = p.y + Math.sin(s.ang) * baseR * 1.18;
      // Pulsing incubation halo
      const pulse = 0.4 + 0.5 * (Math.sin(t * 1.0 + s.ang) + 1) / 2;
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 24);
      halo.addColorStop(0, motifAccent(0.30 * pulse * k));
      halo.addColorStop(1, motifAccent(0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI * 2); ctx.fill();
      // Empty outline
      ctx.strokeStyle = motifLineColor(0.6 * k);
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(sx, sy, slotR, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // Label
      drawHudText(ctx, sx + slotR + 4, sy + 3, s.label, 0.5 * k, 8);
    });
  },

  // ============================================================
  // 5) MANIFIESTO — quiet permanence.
  // A long horizon line, a faint vertical, and one slow ring
  // cadence. No dial, no sweep. Architectural restraint.
  // ============================================================
  5: function (ctx, p, zoom, t, k) {
    const baseR = 220 * (0.7 + zoom * 0.9);
    ctx.lineCap = 'round';

    // ---- Horizon line (very long, faint, fades to edges) ----
    const horiz = 900 * (0.7 + zoom * 0.9);
    const grad = ctx.createLinearGradient(p.x - horiz / 2, p.y, p.x + horiz / 2, p.y);
    grad.addColorStop(0, motifLineColor(0));
    grad.addColorStop(0.5, motifLineColor(0.50 * k));
    grad.addColorStop(1, motifLineColor(0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(p.x - horiz / 2, p.y); ctx.lineTo(p.x + horiz / 2, p.y);
    ctx.stroke();

    // ---- Vertical axis (faint, asymmetric — taller above) ----
    const vUp = 280 * (0.7 + zoom * 0.9);
    const vDn = 180 * (0.7 + zoom * 0.9);
    const vgrad = ctx.createLinearGradient(p.x, p.y - vUp, p.x, p.y + vDn);
    vgrad.addColorStop(0, motifLineColor(0));
    vgrad.addColorStop(0.6, motifLineColor(0.32 * k));
    vgrad.addColorStop(1, motifLineColor(0));
    ctx.strokeStyle = vgrad;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - vUp); ctx.lineTo(p.x, p.y + vDn);
    ctx.stroke();

    // ---- One slow ring cadence — three rings, very slow expansion ----
    for (let i = 0; i < 3; i++) {
      const phase = ((t * 0.06) + i / 3) % 1;
      const r = 30 + phase * baseR;
      const a = Math.sin(phase * Math.PI) * 0.32 * k;
      ctx.strokeStyle = motifAccent(a);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ---- Center monolith dot ----
    ctx.fillStyle = motifHotColor(0.85 * k);
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
  },
};

// ============================================================
// MOTIF UTILITIES
// ============================================================
function drawCornerTicks(ctx, x1, y1, x2, y2, len) {
  ctx.beginPath();
  // TL
  ctx.moveTo(x1, y1 + len); ctx.lineTo(x1, y1); ctx.lineTo(x1 + len, y1);
  // TR
  ctx.moveTo(x2 - len, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + len);
  // BR
  ctx.moveTo(x2, y2 - len); ctx.lineTo(x2, y2); ctx.lineTo(x2 - len, y2);
  // BL
  ctx.moveTo(x1 + len, y2); ctx.lineTo(x1, y2); ctx.lineTo(x1, y2 - len);
  ctx.stroke();
}

function drawHudText(ctx, x, y, txt, alpha, sizePx) {
  ctx.font = `${sizePx || 9}px ui-monospace, "JetBrains Mono", monospace`;
  ctx.fillStyle = `rgba(170, 200, 240, ${alpha.toFixed(3)})`;
  ctx.textAlign = 'left';
  ctx.fillText(txt, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function drawCortexMesh(ctx, cx, cy, radius, t, alpha) {
  // A soft mesh of curves arcing around the hub — feels like cortex layers.
  const layers = 5;
  for (let l = 0; l < layers; l++) {
    const r = radius * (0.45 + l * 0.13);
    ctx.strokeStyle = `rgba(140, 180, 240, ${(alpha * (1 - l * 0.15)).toFixed(3)})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const segs = 36;
    for (let i = 0; i <= segs; i++) {
      const a = i / segs * Math.PI * 2;
      const wob = Math.sin(a * 5 + t * 0.6 + l) * 4;
      const x = cx + Math.cos(a) * (r + wob);
      const y = cy + Math.sin(a) * (r + wob);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Deterministic dendritic tree centered at (cx, cy).
// Returns branches in growth order so the caller can reveal progressively.
function motifBuildTree(cx, cy, zoom) {
  const out = [];
  let s = 7919;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const baseLen = 60 * (0.7 + zoom * 1.0);
  function grow(x, y, ang, len, depth, width) {
    if (depth <= 0 || len < 6) return;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    const ccx = (x + x2) / 2 + Math.cos(ang + Math.PI / 2) * (rng() - 0.5) * len * 0.35;
    const ccy = (y + y2) / 2 + Math.sin(ang + Math.PI / 2) * (rng() - 0.5) * len * 0.35;
    out.push({ x1: x, y1: y, x2, y2, cx: ccx, cy: ccy, w: width });
    const branchAng = 0.45 + rng() * 0.45;
    grow(x2, y2, ang - branchAng, len * (0.62 + rng() * 0.18), depth - 1, Math.max(0.5, width * 0.7));
    grow(x2, y2, ang + branchAng, len * (0.62 + rng() * 0.18), depth - 1, Math.max(0.5, width * 0.7));
  }
  // Six main directions radiating out — like a true dendritic crown
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.2;
    grow(cx, cy, a, baseLen, 4, 1.4);
  }
  return out;
}

  // Smooth hermite/catmull interpolation through a list of 2D points.
  function sampleCurve(points, t) {
    const n = points.length - 1;
    const idx = Math.min(n - 1, Math.floor(t * n));
    const localT = t * n - idx;
    const p0 = points[Math.max(0, idx - 1)];
    const p1 = points[idx];
    const p2 = points[Math.min(n, idx + 1)];
    const p3 = points[Math.min(n, idx + 2)];
    // Catmull-Rom
    const tt = localT * localT;
    const ttt = tt * localT;
    const a = -0.5 * ttt + tt - 0.5 * localT;
    const b =  1.5 * ttt - 2.5 * tt + 1.0;
    const c = -1.5 * ttt + 2.0 * tt + 0.5 * localT;
    const d =  0.5 * ttt - 0.5 * tt;
    return {
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    };
  }

  // ============================================================
  // BUILD GRAPH — scattered neurons with organic connections.
  // We plant hubs first, then sprinkle ~380 filler neurons across
  // the plane biased toward clusters around each hub, then wire
  // nearest-neighbor edges.
  // ============================================================
  function buildGraph() {
    const rng = (() => { let s = 12345; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const nodes = [];

    // Hubs
    HUBS.forEach(h => {
      nodes.push({ x: h.x, y: h.y, r: 3.8, hub: h.id, pulse: rng(), brightness: 1.0 });
    });

    // Cluster filler around each hub
    HUBS.slice(1, 5).forEach(h => {
      const count = 55;
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2;
        const d = 80 + rng() * 540;
        nodes.push({
          x: h.x + Math.cos(a) * d,
          y: h.y + Math.sin(a) * d,
          r: 1.1 + rng() * 1.6,
          hub: null,
          pulse: rng(),
          brightness: 0.35 + rng() * 0.45,
        });
      }
    });

    // Bridge neurons between hubs (along connecting lines)
    for (let i = 1; i < HUBS.length; i++) {
      for (let j = i + 1; j < HUBS.length; j++) {
        const a = HUBS[i], b = HUBS[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist > 3200) continue;
        const steps = 18;
        for (let k = 1; k < steps; k++) {
          const t = k / steps;
          const jx = (rng() - 0.5) * 260;
          const jy = (rng() - 0.5) * 260;
          nodes.push({
            x: a.x + (b.x - a.x) * t + jx,
            y: a.y + (b.y - a.y) * t + jy,
            r: 0.9 + rng() * 1.3,
            hub: null,
            pulse: rng(),
            brightness: 0.28 + rng() * 0.35,
          });
        }
      }
    }

    // Ambient field
    for (let i = 0; i < 80; i++) {
      nodes.push({
        x: (rng() - 0.5) * 4400,
        y: (rng() - 0.5) * 2800,
        r: 0.7 + rng() * 1.1,
        hub: null,
        pulse: rng(),
        brightness: 0.18 + rng() * 0.3,
      });
    }

    // Build edges: each node connects to its 2-3 nearest neighbors.
    const edges = [];
    const seen = new Set();
    for (let i = 0; i < nodes.length; i++) {
      const dists = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (d < 420) dists.push([d, j]);
      }
      dists.sort((a, b) => a[0] - b[0]);
      const connectN = 2 + (rng() < 0.3 ? 1 : 0);
      for (let k = 0; k < Math.min(connectN, dists.length); k++) {
        const j = dists[k][1];
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          // Bezier control offset perpendicular to the edge — each
          // edge gets a personality (slight curve, varying side).
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len; // perpendicular
          const sign = rng() < 0.5 ? -1 : 1;
          const curveAmp = (0.10 + rng() * 0.18) * len * sign;
          edges.push({
            a: i, b: j, length: dists[k][0],
            // store perpendicular offset for the midpoint control
            cnx: nx * curveAmp,
            cny: ny * curveAmp,
            // per-edge pulse seed (firing phase / interval)
            pulseSeed: rng(),
            pulsePeriod: 2.4 + rng() * 5.5,
          });
        }
      }
    }

    return { nodes, edges };
  }

  // ============================================================
  // MAIN COMPONENT
  // ============================================================
  function NeuralScene() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const graphRef = useRef<any>(null);
    const activeHubRef = useRef(0);
    const bangCompleteRef = useRef(false);
    const [activeHub, setActiveHub] = useState(0);
    const [bangComplete, setBangComplete] = useState(false);

    // Always start scroll at top so the bang fires from genesis frame.
    useEffect(() => {
      if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      window.scrollTo(0, 0);
    }, []);

    // Fade scroll hint after first scroll.
    useEffect(() => {
      const onScroll = () => {
        const hint = document.querySelector('.auc-scroll-hint') as HTMLElement | null;
        if (!hint) return;
        hint.style.opacity = window.scrollY > 60 ? '0' : '';
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
      let w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);

      graphRef.current = buildGraph();
      const { nodes, edges } = graphRef.current;

      // How many edges have been "drawn" by the bang.
      // Edges are sorted by distance from origin so they reveal outward.
      edges.forEach(e => {
        const midX = (nodes[e.a].x + nodes[e.b].x) / 2;
        const midY = (nodes[e.a].y + nodes[e.b].y) / 2;
        e.originDist = Math.hypot(midX, midY);
      });
      edges.sort((a, b) => a.originDist - b.originDist);
      nodes.forEach(n => { n.originDist = Math.hypot(n.x, n.y); });
      const nodeOrder = nodes.map((_, i) => i).sort(
        (a, b) => nodes[a].originDist - nodes[b].originDist
      );

      function fit() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      fit();
      window.addEventListener('resize', fit);

      // ==========================================================
      // CAMERA PATH — Catmull-Rom through hubs, with a gentle
      // curve bias between them.
      // ==========================================================
      const pathPoints = [
        { x: 0, y: 0 },                         // genesis
        HUBS[1],                                // MED
        { x:   200, y: -150 },                  // ease
        HUBS[2],                                // AI
        { x:   700, y: -500 },
        HUBS[3],                                // ACOPLE
        { x:  -400, y:   100 },
        HUBS[4],                                // FUTURO
        { x:  -400, y:   200 },
        HUBS[5],                                // MANIFESTO
        { x:  -200, y:   100 },                 // ease back
        { x: 0, y: 0 },                         // loop-back genesis (hub 6)
      ];

      // Each hub maps to a scroll-% anchor.
      // pathPoints is 12 entries; curve t=0..1 covers all.
      // Genesis (hub 0) holds for the first 16% of scroll — a deliberate
      // pause on the brand mark before the journey begins.
      // USER EDIT: AI hub (index 2) given more dwell — pushed ACOPLE further
      // out so AI takes ~22% of the journey instead of ~16%.
      const HUB_T = [0.00, 0.18, 0.34, 0.56, 0.70, 0.85, 0.998];

      // ==========================================================
      // ANIMATION STATE
      // ==========================================================
      let startT = performance.now();
      let scrollProgress = 0;      // 0..1 based on scroll position

      // Scroll progress is relative to the scene's 800vh container, not
      // the total document — downstream sections must not affect timing.
      function onScroll() {
        const sceneScrollMax = Math.max(1, 7 * window.innerHeight); // 800vh content - 100vh viewport = 700vh of scrollable distance
        scrollProgress = Math.min(1, Math.max(0, window.scrollY / sceneScrollMax));
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      // Bang timing. The bang progresses on time, not scroll, because
      // it fires once at load.
      const BANG_DURATION = 4600; // ms
      const BANG_HOLD = 700;      // settle time after bang

      function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      // ==========================================================
      // RENDER LOOP
      // ==========================================================
      function tick(now) {
        const elapsed = now - startT;
        const bangT = Math.min(1, elapsed / BANG_DURATION);
        const bangEase = easeOutCubic(bangT);
        const settled = elapsed > (BANG_DURATION + BANG_HOLD);

        if (settled && !bangCompleteRef.current) {
          bangCompleteRef.current = true;
          // Force the user back to the top so the scroll narrative
          // begins at INFRAESTRUCTURA (hub 0), not wherever an older
          // scroll position landed during the bang.
          window.scrollTo(0, 0);
          scrollProgress = 0;
          setBangComplete(true);
        }

        // --------- Camera ---------
        // Before bang completes, camera sits at origin, zoomed out quite far
        // so the growing graph fills the view.
        let camX = 0, camY = 0, zoom = 0.38;

        if (settled) {
          // After bang: scroll drives camera along the path.
          // Re-map scroll 0..1 with a deliberate genesis dwell:
          //  s = 0 … 0.14   → pathT = 0  (logo holds, no motifs)
          //  s = 0.14 … 0.97 → pathT = 0..1 (the journey)
          //  s = 0.97 … 1.0  → pathT = 1  (loop-back logo holds)
          const s = scrollProgress;
          let pathT;
          if (s < 0.14) pathT = 0;
          else if (s > 0.97) pathT = 1;
          else pathT = (s - 0.14) / 0.83;
          const p = sampleCurve(pathPoints, pathT);
          camX = p.x;
          camY = p.y;
          // Zoom in slightly when close to a hub (dramatic reveal)
          let nearHubT = 1;
          HUB_T.forEach(ht => {
            const d = Math.abs(pathT - ht);
            if (d < nearHubT) nearHubT = d;
          });
          const closeness = Math.max(0, 1 - nearHubT / 0.08);
          zoom = 0.58 - closeness * 0.12;
        } else {
          // During bang: zoom pulls out slightly as graph grows
          zoom = 0.24 + bangEase * 0.32;
        }

        // --------- Determine active hub ---------
        if (settled) {
          const s = scrollProgress;
          let pathT;
          if (s < 0.14) pathT = 0;
          else if (s > 0.97) pathT = 1;
          else pathT = (s - 0.14) / 0.83;
          let best = 0, bestD = 1e9;
          HUB_T.forEach((ht, i) => {
            const d = Math.abs(pathT - ht);
            if (d < bestD) { bestD = d; best = i; }
          });
          if (best !== activeHubRef.current) {
            activeHubRef.current = best;
            setActiveHub(best);
          }
        }

        // --------- Clear ---------
        // Base background — deep marine with soft center glow
        const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.7);
        bgGrad.addColorStop(0, '#061127');
        bgGrad.addColorStop(0.55, '#020817');
        bgGrad.addColorStop(1, '#01040c');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // --------- Project ---------
        const cx = w / 2;
        const cy = h / 2;
        function project(nx, ny) {
          return {
            x: cx + (nx - camX) * zoom,
            y: cy + (ny - camY) * zoom,
          };
        }

        // --------- Bang reveal progress per node / edge ---------
        // Reveal nodes outward from origin over the bang duration.
        const revealedNodes = Math.floor(bangEase * nodeOrder.length);
        const revealedEdges = Math.floor(bangEase * edges.length);

        // --------- Global opacity scales based on bang ---------
        const netOpacity = settled ? 1 : Math.pow(bangEase, 0.7);

        // --------- Draw edges (curved dendrites) ---------
        ctx.lineCap = 'round';
        const edgeLimit = settled ? edges.length : revealedEdges;
        const tSec = now / 1000;
        const pulses = []; // collected, drawn after edges
        for (let i = 0; i < edgeLimit; i++) {
          const e = edges[i];
          const na = nodes[e.a];
          const nb = nodes[e.b];
          const pa = project(na.x, na.y);
          const pb = project(nb.x, nb.y);
          // Bezier control point (curved away from straight line)
          const mx = (na.x + nb.x) / 2 + (e.cnx || 0);
          const my = (na.y + nb.y) / 2 + (e.cny || 0);
          const pc = project(mx, my);
          // Cull (loose AABB on three points)
          const minX = Math.min(pa.x, pb.x, pc.x);
          const maxX = Math.max(pa.x, pb.x, pc.x);
          const minY = Math.min(pa.y, pb.y, pc.y);
          const maxY = Math.max(pa.y, pb.y, pc.y);
          if (maxX < -50 || minX > w + 50 || maxY < -50 || minY > h + 50) continue;

          const freshness = settled ? 0 : Math.max(0, 1 - (revealedEdges - i) / 16);

          const base = 0.05 + 0.04 * Math.min(1, na.brightness);
          const alpha = netOpacity * (base + freshness * 0.55);
          const r = 110 + freshness * 110;
          const g = 145 + freshness * 75;
          const b = 215;
          ctx.strokeStyle = `rgba(${r | 0}, ${g | 0}, ${b}, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.7 + freshness * 1.3;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.quadraticCurveTo(pc.x, pc.y, pb.x, pb.y);
          ctx.stroke();

          // Traveling pulse along the curve (action potential)
          if (settled && e.length > 90 && e.pulsePeriod) {
            const phase = (tSec / e.pulsePeriod + e.pulseSeed) % 1;
            if (phase < 0.42) {
              const t = phase / 0.42;
              const inv = 1 - t;
              const px = inv * inv * pa.x + 2 * inv * t * pc.x + t * t * pb.x;
              const py = inv * inv * pa.y + 2 * inv * t * pc.y + t * t * pb.y;
              const fade = Math.sin(t * Math.PI);
              pulses.push({ x: px, y: py, intensity: fade });
            }
          }
        }
        // Pulses on top of edges (under nodes)
        for (let i = 0; i < pulses.length; i++) {
          const p = pulses[i];
          const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
          halo.addColorStop(0, `rgba(120, 180, 255, ${(0.55 * p.intensity).toFixed(3)})`);
          halo.addColorStop(1, 'rgba(120, 180, 255, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(220, 235, 255, ${(0.95 * p.intensity).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // --------- Draw hub motifs (native — each hub IS its motif) ---------
        // Each motif sits in world space around its hub and projects through
        // the same camera, so it reads as part of the network, not an overlay.
        // Active hub motif renders at full strength across a wide scroll
        // plateau; nearby hubs render at reduced strength. This gives the
        // user a generous reading window for every section.
        if (settled) {
          // Path-T proximity → motif strength: full near hub center,
          // gentle falloff over a wide band so the motif lingers as the
          // user scrolls.
          const sCur = scrollProgress;
          let curT;
          if (sCur < 0.14) curT = 0;
          else if (sCur > 0.97) curT = 1;
          else curT = (sCur - 0.14) / 0.83;

          for (let h = 1; h < HUBS.length; h++) {
            const hub = HUBS[h];
            const hp = project(hub.x, hub.y);
            // Cull off-screen
            if (hp.x < -500 || hp.x > w + 500 || hp.y < -500 || hp.y > h + 500) continue;

            // Plateau: full strength across a wide band of path-T;
            // smooth eased fade beyond. Generous reading window.
            const dT = Math.abs(curT - HUB_T[h]);
            const PLATEAU = 0.075;  // full strength radius
            const FALLOFF = 0.07;   // fade band beyond plateau
            let intensity;
            if (dT < PLATEAU) intensity = 1;
            else if (dT < PLATEAU + FALLOFF) {
              // Smoothstep falloff for fluid appearance
              const t01 = (dT - PLATEAU) / FALLOFF;
              const sm = 1 - (t01 * t01 * (3 - 2 * t01));
              intensity = sm;
            }
            else intensity = 0;

            // Suppress motifs near genesis (hub 0) and the loop-back (hub 6)
            // — those moments are pure brand reveal.
            const dT0 = Math.abs(curT - HUB_T[0]);
            const dT6 = Math.abs(curT - HUB_T[6]);
            const closeToGenesis = Math.min(dT0, dT6);
            if (closeToGenesis < 0.10) {
              const k = closeToGenesis / 0.10;
              const km = k * k * (3 - 2 * k);
              intensity *= km;
            }

            if (intensity < 0.005) continue;
            const motif = HUB_MOTIFS[h];
            if (motif) motif(ctx, hp, zoom, tSec, intensity);
          }
        }

        // --------- Draw nodes ---------
        const nodeLimit = settled ? nodes.length : revealedNodes;
        const nowSec = now / 1000;
        for (let k = 0; k < nodeLimit; k++) {
          const i = nodeOrder[k];
          const n = nodes[i];
          const pp = project(n.x, n.y);
          if (pp.x < -20 || pp.x > w + 20 || pp.y < -20 || pp.y > h + 20) continue;

          const freshness = settled ? 0 : Math.max(0, 1 - (revealedNodes - k) / 8);
          const pulse = 0.7 + 0.3 * Math.sin(nowSec * 1.2 + n.pulse * 6.28);
          const isHub = n.hub !== null && n.hub !== undefined;
          const isActiveHub = isHub && n.hub === activeHubRef.current && settled;

          if (isHub) {
            // ---------- SOMA: membrane ring + nucleus ----------
            const baseR = 12 * zoom * (isActiveHub ? 2.2 : 1) + freshness * 14;
            // Outer halo (slow firing)
            const fire = 0.55 + 0.45 * Math.sin(nowSec * 0.9 + n.pulse * 6.28);
            const haloR = baseR * (4.6 + fire * 0.6);
            const haloA = netOpacity * (isActiveHub ? 0.55 : 0.32) * fire;
            const halo = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, haloR);
            halo.addColorStop(0, `rgba(110, 165, 255, ${haloA.toFixed(3)})`);
            halo.addColorStop(0.4, `rgba(80, 130, 235, ${(haloA * 0.4).toFixed(3)})`);
            halo.addColorStop(1, 'rgba(60, 110, 220, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(pp.x, pp.y, haloR, 0, Math.PI * 2);
            ctx.fill();

            // Membrane ring (slim, slightly broken)
            ctx.lineWidth = Math.max(1, 1.2 * zoom + (isActiveHub ? 0.6 : 0));
            ctx.strokeStyle = `rgba(170, 200, 245, ${(netOpacity * (isActiveHub ? 0.7 : 0.45)).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(pp.x, pp.y, baseR, 0, Math.PI * 2);
            ctx.stroke();

            // Inner shadow (hollow membrane look)
            ctx.fillStyle = `rgba(8, 14, 30, ${(netOpacity * 0.85).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(pp.x, pp.y, baseR * 0.86, 0, Math.PI * 2);
            ctx.fill();

            // Nucleus (bright core that pulses)
            const nucR = baseR * 0.34 * (1 + 0.18 * Math.sin(nowSec * 2.4 + n.pulse * 6.28));
            const nucA = netOpacity * (isActiveHub ? 1 : 0.85);
            const nucleus = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, nucR * 2);
            nucleus.addColorStop(0, `rgba(235, 245, 255, ${nucA.toFixed(3)})`);
            nucleus.addColorStop(0.4, `rgba(155, 195, 255, ${(nucA * 0.7).toFixed(3)})`);
            nucleus.addColorStop(1, 'rgba(80, 130, 220, 0)');
            ctx.fillStyle = nucleus;
            ctx.beginPath();
            ctx.arc(pp.x, pp.y, nucR * 2, 0, Math.PI * 2);
            ctx.fill();

            // Active hub: thin outer ring (highlight)
            if (isActiveHub) {
              ctx.strokeStyle = `rgba(200, 220, 255, ${(0.6 + 0.3 * fire).toFixed(3)})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.arc(pp.x, pp.y, baseR * 1.55, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else {
            // ---------- DENDRITIC SPINE (non-hub) ----------
            // Subtle, smaller — these are filler/synapses, not stars.
            const haloAlpha = netOpacity * 0.10 * pulse;
            const haloR = (n.r * 4.5) * zoom + freshness * 10;
            if (haloAlpha > 0.02) {
              const halo = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, haloR);
              halo.addColorStop(0, `rgba(120, 170, 255, ${haloAlpha.toFixed(3)})`);
              halo.addColorStop(1, 'rgba(120, 170, 255, 0)');
              ctx.fillStyle = halo;
              ctx.beginPath();
              ctx.arc(pp.x, pp.y, haloR, 0, Math.PI * 2);
              ctx.fill();
            }
            const dotR = Math.max(0.5, n.r * 0.85 * zoom + freshness * 1.4);
            const a = netOpacity * (n.brightness * 0.85 + freshness * 0.5);
            ctx.fillStyle = `rgba(165, 188, 225, ${Math.min(0.75, a).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(pp.x, pp.y, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Frame ID HUD value (world coords)
        if (window.__aucHud) window.__aucHud(camX, camY, activeHubRef.current);
      }
      // Some embeddings (offscreen iframes, hidden tabs) throttle
      // requestAnimationFrame to zero. We use setInterval as the
      // primary clock so the scene runs even when the iframe is
      // not the active document.
      const FRAME_MS = 1000 / 60;
      const intervalId = setInterval(() => tick(performance.now()), FRAME_MS);

      return () => {
        clearInterval(intervalId);
        window.removeEventListener('resize', fit);
        window.removeEventListener('scroll', onScroll);
      };
    }, []);

    return (
      <div className="auc-landing-root">
        <div className="auc-sticky-zone">
        {/* Top nav — design system style */}
        <nav className="auc-nav">
          <div className="auc-nav-left">
            <a className="auc-wordmark" href="/">
              <img className="auc-wordmark-glyph" src="/auctorum-mark-azul.png" alt="AUCTORUM" />
              AUCTORUM
            </a>
          </div>
          <div className="auc-nav-right">
            <a className="auc-nav-link" href="#productos">Sistemas</a>
            <a className="auc-nav-link" href="/about">Sobre nosotros</a>
            <a className="auc-nav-link" href="#tecnologia">Tecnología</a>
            <a className="auc-nav-link" href="/login">Iniciar sesión</a>
            <a className="auc-nav-cta" href="/signup">Comenzar</a>
          </div>
        </nav>

        {/* HUD overlays */}
        <div className="auc-hud auc-hud-bl"><div>SALTILLO · MX</div></div>
        <div className="auc-hud auc-hud-br"><div>contacto@auctorum.mx</div></div>
        <div className="auc-scroll-hint" aria-hidden="true">
          <span>SCROLL</span>
          <span className="auc-scroll-hint-line"></span>
        </div>

        <div className="auc-stage">
          <canvas ref={canvasRef} className="auc-canvas" />
        </div>

        {/* Logo — the AUCTORUM mark fades in once the bang completes, full opacity */}
        <img
          src="/auctorum-mark-azul.png"
          alt=""
          className={`auc-genesis-logo ${bangComplete && (activeHub === 0 || activeHub === 6) ? 'is-revealed' : ''}`}
        />

        {/* Floating copy — one overlay per hub */}
        <Floater node={0} active={activeHub === 0 && bangComplete}
          meta="AUCTORUM SYSTEMS · SALTILLO, MX"
          title={<React.Fragment>Infraestructura<br/>para lo que <em>viene</em>.</React.Fragment>}
          body="Ecosistema de empresas tecnológicas construido con permanencia. No levantamos capital de riesgo. Servimos a las industrias que mantienen a México funcionando."
          status={<React.Fragment><span className="dot" />Sistemas en línea · 05 sistemas</React.Fragment>}
        />
        <Floater node={1} active={activeHub === 1 && bangComplete}
          meta="§ 01 · AUCTORUM · MED"
          title={<React.Fragment>Concierge<br/><em>clínico</em>.</React.Fragment>}
          body="Gestión clínica multi-tenant. WhatsApp nativo, agenda inteligente, facturación CFDI. Provisioning de una clínica completa en treinta segundos."
          status={<React.Fragment><span className="dot" />LIVE · 12 clínicas activas</React.Fragment>}
        />
        <Floater node={2} active={activeHub === 2 && bangComplete}
          meta="§ 02 · AUCTORUM · AI"
          title={<React.Fragment>Agente<br/><em>soberano</em>.</React.Fragment>}
          body="El Linux de las IAs. Inteligencia personal soberana, open source y self-hosted: corre en tu propio hardware, no cede tus datos a la nube. Swarm de modelos especializados, integrado con Gmail, Calendar, GitHub y WhatsApp. En producción desde febrero 2026."
          status={<React.Fragment><span className="dot" />LIVE · AGPL‑3.0 + CERN OHL‑S</React.Fragment>}
        />
        <Floater node={3} active={activeHub === 3 && bangComplete}
          meta="§ 03 · ACOPLE"
          title={<React.Fragment>Mercado<br/><em>industrial</em>.</React.Fragment>}
          body="Los rieles del comercio B2B del noreste. Búsqueda propietaria, reputación verificada, conexiones monetizadas por tier. El único directorio serio de la región."
          status={<React.Fragment><span className="dot" />DEV · Lanzamiento Q2 2026</React.Fragment>}
        />
        <Floater node={4} active={activeHub === 4 && bangComplete}
          meta="§ 04 · HORIZONTE"
          title={<React.Fragment>Lo que <em>viene</em>.</React.Fragment>}
          body="Nuevas ramas en desarrollo. Energía, logística pesada, notarización distribuida. Cada brazo resuelve un problema que nadie más en este país está resolviendo."
          status={<React.Fragment><span className="dot" />04 proyectos en incubación</React.Fragment>}
        />
        <Floater node={5} active={activeHub === 5 && bangComplete}
          meta="§ 05 · MANIFIESTO"
          title={<React.Fragment>Construimos<br/>con <em>permanencia</em>.</React.Fragment>}
          body="Cinco décadas, no cinco años. Las empresas que construimos deben sobrevivir a sus fundadores. Esta es la postura desde la que operamos."
          status="contacto@auctorum.mx"
        />
        <Floater node={6} active={activeHub === 6 && bangComplete}
          meta="AUCTORUM SYSTEMS · SALTILLO, MX"
          title={<React.Fragment>El contrato es promesa.<br/>El código abierto<br/>es <em>prueba</em>.</React.Fragment>}
          body="Cinco sistemas. Una arquitectura. Permanencia por diseño."
          status={<React.Fragment><span className="dot" />contacto@auctorum.mx</React.Fragment>}
        />
        </div>
      </div>
    );
  }

  function Floater({ node, active, meta, title, body, status }: {
    node: number; active: boolean; meta: ReactNode; title: ReactNode; body: ReactNode; status: ReactNode;
  }) {
    return (
      <aside className={`auc-floater ${active ? 'is-active' : ''}`} data-node={node}>
        <div className="auc-floater-meta">
          <span className="r" />
          <span>{meta}</span>
        </div>
        <h1 className="auc-floater-title">{title}</h1>
        <p className="auc-floater-body">{body}</p>
        <div className="auc-floater-status">{status}</div>
      </aside>
    );
  }

export default NeuralScene
export { Floater }
