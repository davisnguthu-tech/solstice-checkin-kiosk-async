const webhookHandler = require('./webhooks/print-complete');

module.exports = async (req, res) => {
  return webhookHandler(req, res);
};
