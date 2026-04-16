import mongoose from 'mongoose';

const strokeSchema = new mongoose.Schema({
  x1: Number,
  y1: Number,
  x2: Number,
  y2: Number,
  color: String,
  brushSize: Number,
  tool: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: false });

const canvasSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  strokes: [strokeSchema],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Canvas = mongoose.model('Canvas', canvasSchema);

export default Canvas;
