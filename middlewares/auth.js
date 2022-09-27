const {executionLogistique} = require('../utils/airtable')

const auth = async (req, res, next) => {
  console.log("authMiddleWare", req.cookies);
  let user_id = req?.cookies["user_id"] || null

  if (user_id) {
    req.client = await executionLogistique('Clients').find(user_id);
    req.executionLogistique = executionLogistique
    next();
  }
  else {
    res.redirect('/');
  }
}
module.exports = auth;
