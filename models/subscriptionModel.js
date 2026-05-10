import { model, Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    subscription_id: {
      type: String
    },
    status: {
        type: String,
        default: 'created'
    },
    planId: {
        type: String
    },
    start: {
      type: Number,
      default: null
    },
    end: {
      type: Number,
      default: null
    },
    cancelRequested: {
      type: Boolean,
      default: false
    }
  },
  {
    strict: "throw",
  }
);

const Subscription = model("Subscription", subscriptionSchema);

export default Subscription;
