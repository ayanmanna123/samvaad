import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eraser, Edit3, Trash2, MousePointer2, Settings2 } from 'lucide-react';
import socketService from '../../services/socket';
import { useDrawing } from '../../hooks/useDrawing';

/**
 * Chat Overlay Collaborative Canvas
 * Sits directly on top of the message list
 */
const DrawingCanvas = ({ conversationId, isActive, onClose, user }) => {
  const [showControls, setShowControls] = useState(true);

  const onRemoteDraw = (data) => {
    socketService.emit('draw', {
      conversationId,
      ...data
    });
  };

  const onMouseMove = (coords) => {
    socketService.emit('mouse-move', {
      conversationId,
      ...coords
    });
  };

  const {
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
  } = useDrawing({ onRemoteDraw, onMouseMove });

  // Handle Socket Events
  useEffect(() => {
    socketService.emit('get-canvas-state', { conversationId });

    socketService.on('canvas-state', (strokes) => {
      setStrokes(strokes);
    });

    socketService.on('draw', (data) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      drawLine(
        data.x1 * rect.width, 
        data.y1 * rect.height, 
        data.x2 * rect.width, 
        data.y2 * rect.height, 
        data.color, 
        data.brushSize, 
        data.tool
      );
      // Also add to local history so it persists after resize
      setLocalStrokes(prev => [...prev, data]);
    });

    socketService.on('mouse-move', (data) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    });

    socketService.on('clear-canvas', () => {
      clearCanvas();
    });

    return () => {
      socketService.off('canvas-state');
      socketService.off('draw');
      socketService.off('mouse-move');
      socketService.off('clear-canvas');
    };
  }, [canvasRef, clearCanvas, drawLine, setStrokes, conversationId]);

  const handleClear = () => {
    clearCanvas();
    socketService.emit('clear-canvas', { conversationId });
  };

  const colors = [
    '#ff003c', '#ff8a00', '#facc15', '#4ade80', 
    '#2dd4bf', '#3b82f6', '#8b5cf6', '#ec4899',
    '#ffffff', '#000000'
  ];

  return (
    <div className={`absolute inset-0 z-40 transition-all ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        onMouseDown={isActive ? startDrawing : undefined}
        onMouseUp={isActive ? endDrawing : undefined}
        onMouseMove={isActive ? handleMouseMove : undefined}
        onMouseOut={endDrawing}
        onTouchStart={isActive ? startDrawing : undefined}
        onTouchMove={isActive ? handleMouseMove : undefined}
        onTouchEnd={endDrawing}
        className="w-full h-full touch-none"
      />

      {/* Collaborative Cursors (Always visible) */}
      {Array.from(cursors.values()).map((c) => (
        <motion.div
          key={c.userId}
          className="absolute pointer-events-none z-50 flex flex-col items-center gap-1"
          style={{ 
            left: `${c.x * 100}%`, 
            top: `${c.y * 100}%` 
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 200, mass: 0.5 }}
        >
          <MousePointer2 size={16} className="text-white fill-sv-accent drop-shadow-md" />
          <span className="px-1.5 py-0.5 bg-sv-accent text-white text-[9px] font-black rounded-full shadow-lg whitespace-nowrap uppercase">
            {c.userName}
          </span >
        </motion.div>
      ))}

      {/* Toolbar (Only visible when active) */}
      <AnimatePresence>
        {isActive && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-4 p-3 bg-black/60 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl pointer-events-auto z-[2101]"
          >
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setTool('pen')}
                className={`p-2.5 rounded-full transition-all ${tool === 'pen' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                <Edit3 size={18} />
              </button>
              <button 
                onClick={() => setTool('eraser')}
                className={`p-2.5 rounded-full transition-all ${tool === 'eraser' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                <Eraser size={18} />
              </button>
            </div>

            <div className="w-[1px] h-6 bg-white/10" />

            <div className="flex gap-1.5">
              {colors.slice(0, 8).map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setTool('pen'); }}
                  className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-125 ${color === c && tool === 'pen' ? 'border-white scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="w-[1px] h-6 bg-white/10" />

            <button 
              onClick={handleClear}
              className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all border border-red-500/10"
            >
              <Trash2 size={18} />
            </button>
            
            <button 
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DrawingCanvas;



