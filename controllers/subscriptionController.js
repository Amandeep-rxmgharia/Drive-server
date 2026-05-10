import { razorpayInstance } from "../config/razorpay.js";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";

const plans = {
  plan_SlXnva1xpuWN73: {
    storageInBytes: 2 * 1024 ** 4,
    price: 199,
    periord: "/monthly",
  },
  plan_SlXrQirZfHyimp: {
    storageInBytes: 2 * 1024 ** 4,
    price: 1999,
    period: "/yearly",
  },
  plan_SlXpLXAcSlYL7J: {
    storageInBytes: 5 * 1024 ** 4,
    price: 399,
    period: "/monthly",
  },
  plan_SlXs71A54Btntp: {
    storageInBytes: 5 * 1024 ** 4,
    price: 3999,
    period: "/yearly",
  },
  plan_SlXqEBt9BJD3r5: {
    storageInBytes: 10 * 1024 ** 4,
    price: 699,
    period: "/monthly",
  },
  plan_SlXsqYi0j1onOm: {
    storageInBytes: 10 * 1024 ** 4,
    price: 6999,
    period: "/yearly",
  },
};

export const createSubscription = async (req, res, next) => {
  const { planId } = req.body;
  const user = req.user;
  console.log(planId);
  const userSubscriptionId = user.subscription_id;
  if (userSubscriptionId) {
    const userExistingSubscription = await Subscription.findOne({
      subscription_id: userSubscriptionId,
    });
    const userExistingSubscriptionPlanPrice =
      plans[userExistingSubscription.planId].price;
    const selctedPlanPrice = plans[planId].price;
    if (userExistingSubscription.planId == planId)
      return res.json({ error: "already purchased" });
    if (userExistingSubscriptionPlanPrice > selctedPlanPrice) {
      console.log("downgrading");
      try {
        const newSubscription = await razorpayInstance.subscriptions.create({
          plan_id: planId,
          notes: {
            userId: user._id.toString(),
            oldSubscriptionId: userExistingSubscription.subscription_id,
            type: "subscription_downgrade",
          },
          total_count: 12,
          start_at: userExistingSubscription.end,
        });
        await Subscription.insertOne({
          planId,
          subscription_id: newSubscription.id,
          userId: user._id.toString(),
        });
        return res.json({ subscription_id: newSubscription.id });
      } catch (err) {
        console.log(err);
        next(err);
      }
    }
    if (userExistingSubscriptionPlanPrice < selctedPlanPrice) {
      console.log("upgrading");
      console.log(userExistingSubscription);
      const currentEnd = userExistingSubscription.end;
      const currentTime = Math.floor(Date.now() / 1000);
      const planDuration =
        (userExistingSubscription.end - userExistingSubscription.start) / 86400;
      const daysLeft = Math.floor((currentEnd - currentTime) / 86400);
      const chargePerDay = userExistingSubscriptionPlanPrice / planDuration;
      console.log(chargePerDay);
      console.log(daysLeft);
      const totalReserved = daysLeft * chargePerDay;
      console.log(totalReserved);
      const planChargeAfterDeduction = selctedPlanPrice - totalReserved;
      console.log(planChargeAfterDeduction);
      try {
        const order = await razorpayInstance.orders.create({
          amount: Math.ceil(planChargeAfterDeduction) * 100,
          currency: "INR",
          notes: {
            currency: "INR",
            planId,
            plan_period: plans[planId].period,
            userId: user._id.toString(),
            oldSubscriptionId: userExistingSubscription.subscription_id,
            type: "subscription_upgrade",
          },
        });
        res.json({ order_id: order.id });
        return;
      } catch (err) {
        next(err);
      }
    }
  }
  try {
    const subscription = await razorpayInstance.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      notes: {
        userId: user._id.toString(),
      },
    });
    res.json({ subscription_id: subscription.id });
    console.log(subscription);
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const razorpayWebhook = async (req, res, next) => {
  const entity = req.body;
  if (entity.event === "subscription.authenticated") {
    console.log(entity.payload.subscription.entity);
    if (
      entity.payload.subscription.entity.notes.type !== "subscription_downgrade"
    )
      return;
    const subscriptionId = entity.payload.subscription.entity.id;
    const status = entity.payload.subscription.entity.status;
    const oldSubscriptionId =
      entity.payload.subscription.entity.notes.oldSubscriptionId;
      const userId = entity.payload.subscription.entity.notes.userId
    const startDate = entity.payload.subscription.entity.start_at;
    const endDate = entity.payload.subscription.entity.end_at;
    try {
      const subscription =
        await razorpayInstance.subscriptions.fetch(oldSubscriptionId);
      if (subscription.status == "active") {
        await razorpayInstance.subscriptions.cancel(oldSubscriptionId, {
          cancel_at_cycle_end: 1,
        });
      } else {
        await razorpayInstance.subscriptions.cancel(oldSubscriptionId);
      }
      const authenticatedSub = await Subscription.findOne({
        userId,
        status: "authenticated",
      }).lean();
    } catch (err) {
      console.log(err);
      next(err);
    }
    await Subscription.updateOne(
      { subscription_id: oldSubscriptionId },
      { cancelRequested: true },
    );
    await Subscription.updateOne(
      { subscription_id: subscriptionId },
      { status, start: startDate, end: endDate },
    );
    // res.end();
  }
  if (entity.event === "subscription.activated") {
    const subscription_id = entity.payload.subscription.entity.id;
    const planId = entity.payload.subscription.entity.plan_id;
    const maxStorageInBytes = plans[planId].storageInBytes;
    const startDate = entity.payload.subscription.entity.current_start;
    const endDate = entity.payload.subscription.entity.current_end;
    const userId = entity.payload.subscription.entity.notes.userId;
    await User.findByIdAndUpdate(userId, {
      subscription_id,
      maxStorageInBytes,
    });
    await Subscription.insertOne({
      userId,
      subscription_id: subscription_id,
      planId,
      status: "active",
      start: startDate,
      end: endDate,
    });
    res.end();
  }
  if (entity.event === "payment.captured") {
    const paymentEntity = entity.payload.payment.entity;
    console.log(paymentEntity);
    const isUpgradePayment =
      paymentEntity.notes?.type === "subscription_upgrade";
    if (!isUpgradePayment) return res.end();
    console.log("running this inter");
    const planId = paymentEntity.notes.planId;
    const userId = paymentEntity.notes.userId;
    const plan_period = paymentEntity.notes.plan_period;
    const oldSubscriptionId = paymentEntity.notes.oldSubscriptionId;
    const maxStorageInBytes = plans[planId].storageInBytes;
    try {
      const subscription = await razorpayInstance.subscriptions.create({
        plan_id: planId,
        total_count: 12,
        notes: {
          userId,
        },
        start_at:
          plan_period == "/monthly"
            ? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
            : Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      });
      await razorpayInstance.subscriptions.cancel(oldSubscriptionId);
      const authenticatedSub = await Subscription.find({
        userId,
        status: "authenticated",
      }).lean();
      authenticatedSub.forEach(async (sub) => {
        try {
          await razorpayInstance.subscriptions.cancel(sub.subscription_id);
        } catch (err) {
          next(err);
        }
      });

      await User.findByIdAndUpdate(userId, {
        subscription_id: subscription.id,
        maxStorageInBytes,
      });
      await Subscription.insertOne({
        userId,
        subscription_id: subscription.id,
        planId: planId,
        status: "active",
        start: Math.floor(Date.now() / 1000),
        end:
          plan_period == "/monthly"
            ? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
            : Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      });
    } catch (err) {
      next(err);
    }
    res.end();
  }
  if (entity.event === "subscription.cancelled") {
    const subscription_id = entity.payload.subscription.entity.id;
    await Subscription.deleteOne({ subscription_id });
    res.end();
  }
  console.log(req.body);
};
