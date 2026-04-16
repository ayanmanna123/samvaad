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

  const [localStrokes, setLocalStrokes] = useState([]);

  // High-res virtual height to ensure Y coordinates stay fixed relative to the TOP 
  // as the container grows at the BOTTOM.
  const VIRTUAL_HEIGHT = 1000000;
  
  // Core Drawing Function - Defined first to avoid hosting issues
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

  // Internal helper to re-draw all strokes
  const redraw = useCallback((strokesToDraw, width) => {
    if (!contextRef.current) return;
    strokesToDraw.forEach(s => {
      drawLine(
        s.x1 * width, 
        s.y1 * VIRTUAL_HEIGHT, 
        s.x2 * width, 
        s.y2 * VIRTUAL_HEIGHT, 
        s.color, 
        s.brushSize, 
        s.tool
      );
    });
  }, [drawLine]);

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

      // RE-DRAW existing strokes after resize clears the canvas
      setLocalStrokes(prev => {
        redraw(prev, width);
        return prev;
      });
    };

    resize();
    window.addEventListener('resize', resize);
    
    // Listen for parent size changes (e.g. when messages load)
    const observer = new ResizeObserver(() => resize());
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    return () => {
      window.removeEventListener('resize', resize);
      observer.disconnect();
    };
  }, [redraw]);

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
      onMouseMove({ x: x / width, y: y / VIRTUAL_HEIGHT });
    }

    if (!isDrawing) return;
    
    const lastX = contextRef.current.lastX;
    const lastY = contextRef.current.lastY;

    drawLine(lastX, lastY, x, y, color, brushSize, tool);

    const newStroke = {
      x1: lastX / width,
      y1: lastY / VIRTUAL_HEIGHT,
      x2: x / width,
      y2: y / VIRTUAL_HEIGHT,
      color,
      brushSize,
      tool
    };

    setLocalStrokes(prev => [...prev, newStroke]);

    if (onRemoteDraw) {
      onRemoteDraw(newStroke);
    }

    contextRef.current.lastX = x;
    contextRef.current.lastY = y;
  };

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;
    const ctx = contextRef.current;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setLocalStrokes([]);
  }, []);

  const setStrokes = useCallback((strokes) => {
    if (!canvasRef.current || !contextRef.current) return;
    const canvas = canvasRef.current;
    
    // Clear first to avoid double rendering
    clearCanvas();
    
    const { clientWidth: width } = canvas;
    setLocalStrokes(strokes);
    redraw(strokes, width);
  }, [clearCanvas, redraw]);

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
    setStrokes,
    setLocalStrokes
  };
};

