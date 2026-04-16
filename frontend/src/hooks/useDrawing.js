import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Custom hook for Drawing Canvas Logic
 * Handles initialization, resizing, drawing, tool management, and cursors
 */
export const useDrawing = ({ onRemoteDraw, onMouseMove } = {}) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ff003c');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('pen');
  const [cursors, setCursors] = useState(new Map());

  // Initialize and Resize Canvas with DPI Scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const { clientWidth: width, clientHeight: height } = parent;
      const dpr = window.devicePixelRatio || 1;

      // Set display size
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Set actual resolution
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      contextRef.current = ctx;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Core Drawing Function
  const drawLine = useCallback((x1, y1, x2, y2, strokeColor, size, currentTool) => {
    if (!contextRef.current) return;
    const ctx = contextRef.current;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = size;
    }

    ctx.stroke();
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height
    };
  };

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e.nativeEvent || e);
    setIsDrawing(true);
    contextRef.current.lastX = x;
    contextRef.current.lastY = y;
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const handleMouseMove = (e) => {
    const coords = getCoordinates(e.nativeEvent || e);
    const { x, y, width, height } = coords;

    // Emit cursor position
    if (onMouseMove) {
      onMouseMove({ x: x / width, y: y / height });
    }

    if (!isDrawing) return;
    
    const lastX = contextRef.current.lastX;
    const lastY = contextRef.current.lastY;

    drawLine(lastX, lastY, x, y, color, brushSize, tool);

    if (onRemoteDraw) {
      onRemoteDraw({
        x1: lastX / width,
        y1: lastY / height,
        x2: x / width,
        y2: y / height,
        color,
        brushSize,
        tool
      });
    }

    contextRef.current.lastX = x;
    contextRef.current.lastY = y;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;
    const ctx = contextRef.current;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const setStrokes = useCallback((strokes) => {
    if (!canvasRef.current || !contextRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    strokes.forEach(s => {
      drawLine(
        s.x1 * rect.width, 
        s.y1 * rect.height, 
        s.x2 * rect.width, 
        s.y2 * rect.height, 
        s.color, 
        s.brushSize, 
        s.tool
      );
    });
  }, [drawLine]);

  return {
    canvasRef,
    color,
    setColor,
    brushSize,
    setBrushSize,
    tool,
    setTool,
    cursors,
    setCursors,
    startDrawing,
    endDrawing,
    handleMouseMove,
    clearCanvas,
    drawLine,
    setStrokes
  };
};

