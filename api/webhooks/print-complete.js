const store = require('../lib/store');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const { checkInId } = req.body || {};
  if (!checkInId) return res.status(400).json({error:'checkInId required'});
  const updated = store.updateRecordStatus(checkInId, 'CHECKED_IN', new Date().toISOString());
  if (!updated) return res.status(404).json({error:'Record not found'});
  return res.status(200).json(updated);
};
