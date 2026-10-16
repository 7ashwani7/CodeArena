import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE_PROBLEM',
        'UPDATE_PROBLEM',
        'TOGGLE_PUBLICATION',
        'DELETE_PROBLEM',
        'CREATE_ADMIN'
      ],
      index: true
    },
    targetType: {
      type: String,
      required: true,
      default: 'Problem'
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'targetType',
      required: false,
      index: true
    },
    targetTitle: {
      type: String,
      default: '',
      trim: true
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    adminUsername: {
      type: String,
      required: true,
      trim: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
