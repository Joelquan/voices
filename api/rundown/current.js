const { managerBuildRundown } = require('../_agents');

module.exports = async function handler(req, res) {
  const rundown = await managerBuildRundown(new Date());
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(rundown);
};
