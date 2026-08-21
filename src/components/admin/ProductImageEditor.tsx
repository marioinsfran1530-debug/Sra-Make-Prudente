"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw, X } from "lucide-react";

const CANVAS_SIZE = 800;

type Props = {
  source: string;
  fileName: string;
  saving?: boolean;
  onCancel: () => void;
  onApply: (file: File) => void | Promise<void>;
};

export function ProductImageEditor({
  source,
  fileName,
  saving = false,
  onCancel,
  onApply,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReady(false);
    setError("");
    setRotation(0);
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageRef.current = image;
      setReady(true);
    };
    image.onerror = () => {
      imageRef.current = null;
      setError("Não foi possível abrir esta imagem para edição.");
    };
    image.src = source;

    return () => {
      imageRef.current = null;
    };
  }, [source]);

  const getGeometry = useCallback(() => {
    const image = imageRef.current;
    if (!image) return null;

    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isQuarterTurn = normalizedRotation === 90 || normalizedRotation === 270;
    const rotatedWidth = isQuarterTurn ? image.height : image.width;
    const rotatedHeight = isQuarterTurn ? image.width : image.height;
    const baseScale = Math.max(
      CANVAS_SIZE / rotatedWidth,
      CANVAS_SIZE / rotatedHeight
    );
    const scale = baseScale * zoom;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const visibleWidth = isQuarterTurn ? drawHeight : drawWidth;
    const visibleHeight = isQuarterTurn ? drawWidth : drawHeight;

    return {
      image,
      scale,
      drawWidth,
      drawHeight,
      maxX: Math.max(0, (visibleWidth - CANVAS_SIZE) / 2),
      maxY: Math.max(0, (visibleHeight - CANVAS_SIZE) / 2),
    };
  }, [rotation, zoom]);

  const clampOffset = useCallback(
    (next: { x: number; y: number }) => {
      const geometry = getGeometry();
      if (!geometry) return next;

      return {
        x: Math.max(-geometry.maxX, Math.min(geometry.maxX, next.x)),
        y: Math.max(-geometry.maxY, Math.min(geometry.maxY, next.y)),
      };
    },
    [getGeometry]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const geometry = getGeometry();
    if (!canvas || !context || !geometry) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const safeOffset = clampOffset(offset);

    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    context.save();
    context.translate(
      CANVAS_SIZE / 2 + safeOffset.x,
      CANVAS_SIZE / 2 + safeOffset.y
    );
    context.rotate((rotation * Math.PI) / 180);
    context.drawImage(
      geometry.image,
      -geometry.drawWidth / 2,
      -geometry.drawHeight / 2,
      geometry.drawWidth,
      geometry.drawHeight
    );
    context.restore();
  }, [clampOffset, getGeometry, offset, rotation]);

  useEffect(() => {
    draw();
  }, [draw, ready]);

  function rotate(delta: number) {
    setRotation((current) => current + delta);
    setOffset({ x: 0, y: 0 });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!ready || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current || !ready || saving) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const factor = CANVAS_SIZE / rect.width;
    const dx = (event.clientX - dragRef.current.x) * factor;
    const dy = (event.clientY - dragRef.current.y) * factor;
    dragRef.current = { x: event.clientX, y: event.clientY };

    setOffset((current) => clampOffset({ x: current.x + dx, y: current.y + dy }));
  }

  function stopDragging(event: React.PointerEvent<HTMLCanvasElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function apply() {
    const canvas = canvasRef.current;
    if (!canvas || !ready || saving) return;

    draw();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );

    if (!blob) {
      setError("Não foi possível salvar o ajuste da imagem.");
      return;
    }

    const baseName = fileName.replace(/\.[^.]+$/, "") || "produto";
    const file = new File([blob], `${baseName}-ajustada.jpg`, {
      type: "image/jpeg",
    });

    await onApply(file);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-texto">Ajustar foto</h3>
            <p className="mt-1 text-xs leading-5 text-cinza">
              Arraste para posicionar. O quadrado mostra exatamente como a foto ficará no catálogo.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-rosa/15 text-cinza disabled:opacity-40"
            aria-label="Fechar editor"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-rosa/15 bg-creme">
          <canvas
            ref={canvasRef}
            className="block aspect-square w-full touch-none cursor-move bg-white"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          />
        </div>

        {!ready && !error ? (
          <p className="mt-3 text-xs text-cinza">Abrindo imagem...</p>
        ) : null}

        {error ? <p className="mt-3 text-xs text-vermelho">{error}</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => rotate(-90)}
            disabled={!ready || saving}
            className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 px-3 py-2.5 text-xs font-bold text-texto disabled:opacity-40"
          >
            <RotateCcw size={15} /> Girar esquerda
          </button>
          <button
            type="button"
            onClick={() => rotate(90)}
            disabled={!ready || saving}
            className="flex items-center justify-center gap-2 rounded-xl border border-rosa/20 px-3 py-2.5 text-xs font-bold text-texto disabled:opacity-40"
          >
            <RotateCw size={15} /> Girar direita
          </button>
        </div>

        <label className="mt-4 block">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-texto">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            disabled={!ready || saving}
            onChange={(event) => {
              setZoom(Number(event.target.value));
              setOffset((current) => clampOffset(current));
            }}
            className="w-full accent-rosa-profundo"
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-rosa/20 px-4 py-3 text-sm font-bold text-texto disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!ready || saving}
            className="rounded-xl bg-rosa-profundo px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {saving ? "Salvando..." : "Usar esta foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
