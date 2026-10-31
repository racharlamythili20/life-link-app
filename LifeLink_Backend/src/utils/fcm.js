const admin = require('firebase-admin');

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken || !admin.apps.length) return;

  try {
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK' // example action
      },
      token: fcmToken
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

const sendMulticastPushNotification = async (fcmTokens, title, body, data = {}) => {
  if (!fcmTokens || fcmTokens.length === 0 || !admin.apps.length) return;

  try {
    const message = {
      notification: {
        title,
        body
      },
      data,
      tokens: fcmTokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(response.successCount + ' messages were sent successfully');
  } catch (error) {
    console.error('Error sending multicast message:', error);
  }
};

module.exports = {
  sendPushNotification,
  sendMulticastPushNotification
};
