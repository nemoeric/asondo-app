const airtable = require('airtable')
airtable.configure({ apiKey: 'keyzAH1sWnf44YXQp' })
 
const baseName = {
	executionLogistique : "appehK2uJ3sp8MXwK"
}
const executionLogistique = airtable.base(baseName.executionLogistique);


module.exports = {
  executionLogistique
}