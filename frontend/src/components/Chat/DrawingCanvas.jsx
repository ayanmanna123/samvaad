import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eraser, Edit3, Trash2, ChevronLeft, MousePointer2 } from 'lucide-react';
import socketService from '../../services/socket';
import { useDrawing } from '../../hooks/useDrawing';

/**
 * Collaborative Drawing Canvas (Canva Style)
 * Persists state to MongoDB and syncs cursors/strokes in real-time
 */
const DrawingCanvas = ({ conversationId, onClose, user }) => {
  const [showControls, setShowControls] = useState(true);

  // Sync draw events with socket
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
    setStrokes
  } = useDrawing({ onRemoteDraw, onMouseMove });

  // Handle Socket Events
  useEffect(() => {
    // 1. Fetch initial state
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col bg-black/90 backdrop-blur-md"
    >
      {/* Header */}
      <div className="relative flex items-center justify-between p-6 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10 shadow-lg"
          >
            <X size={20} />
          </button>
          <div>
            <h2 className="text-white font-black text-lg">Live Collaborative Canvas</h2>
            <p className="text-white/40 text-xs uppercase tracking-widest">Everything is synced in real-time</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-4">
            {Array.from(cursors.values()).map((c, i) => (
              <div 
                key={c.userId} 
                className="w-8 h-8 rounded-full border-2 border-black bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold uppercase"
                title={c.userName}
              >
                {c.userName.charAt(0)}
              </div>
            ))}
          </div>
          <button 
            onClick={handleClear}
            className="p-3 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-full transition-all border border-red-500/20 shadow-lg group"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={endDrawing}
          onMouseMove={handleMouseMove}
          onMouseOut={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={handleMouseMove}
          onTouchEnd={endDrawing}
          className="w-full h-full touch-none"
        />

        {/* Other Users' Cursors */}
        {Array.from(cursors.values()).map((c) => (
          <motion.div
            key={c.userId}
            className="absolute pointer-events-none z-50 flex flex-col items-center gap-1"
            animate={{ 
              x: c.x * (canvasRef.current?.clientWidth || 0), 
              y: c.y * (canvasRef.current?.clientHeight || 0) 
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 200, mass: 0.5 }}
          >
            <MousePointer2 size={18} className="text-white fill-indigo-500 drop-shadow-md" />
            <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full shadow-lg whitespace-nowrap">
              {c.userName}
            </span >
          </motion.div>
        ))}

        {/* Toolbar */}
        <AnimatePresence>
          {showControls && (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-6 p-5 bg-white/10 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] border border-white/20"
            >
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setTool('pen')}
                  className={`p-4 rounded-2xl transition-all ${tool === 'pen' ? 'bg-white text-black scale-110' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <Edit3 size={24} />
                </button>
                <button 
                  onClick={() => setTool('eraser')}
                  className={`p-4 rounded-2xl transition-all ${tool === 'eraser' ? 'bg-white text-black scale-110' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                  <Eraser size={24} />
                </button>
              </div>

              <div className="h-px bg-white/10 mx-2" />

              <div className="grid grid-cols-2 gap-3">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setTool('pen'); }}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-125 ${color === c && tool === 'pen' ? 'border-white scale-125 shadow-lg' : 'border-transparent opacity-80'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="h-px bg-white/10 mx-2" />

              <div className="flex flex-col items-center gap-5 pt-2">
                {[4, 8, 16, 32].map(size => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className="group relative flex items-center justify-center w-8 h-8"
                  >
                    <div 
                      className={`rounded-full transition-all duration-300 ${brushSize === size ? 'bg-white scale-110' : 'bg-white/20 group-hover:bg-white/40'}`}
                      style={{ 
                        width: Math.max(size/1.5, 4), 
                        height: Math.max(size/1.5, 4),
                        opacity: brushSize === size ? 1 : 0.6
                      }}
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setShowControls(!showControls)}
          className="absolute left-6 top-6 p-2 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/10 text-white/50 hover:text-white transition-colors"
        >
          {showControls ? <ChevronLeft size={18} /> : <Edit3 size={18} />}
        </button>
      </div>
    </motion.div>
  );
};

export default DrawingCanvas;


