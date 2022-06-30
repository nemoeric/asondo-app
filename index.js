const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
const airtable = require('airtable')
airtable.configure({ apiKey: 'keyzAH1sWnf44YXQp' })


var { Liquid } = require('liquidjs');
var engine = new Liquid();
app.engine('liquid', engine.express()); 
app.set('views', './views');            // specify the views directory
app.set('view engine', 'liquid');       // set liquid to default


const baseName = {
	executionLogistique : "appehK2uJ3sp8MXwK"
}

app.post('/trace', 
	async (req, res) => {
		const base = airtable.base(baseName.executionLogistique);
		console.log(req.body);
		const factures = await base("Ventes").select({
			filterByFormula: `Numero = '${req.body.number}' `
		}).all()

		console.log("ICI", factures.length);
		
		if(factures.length){
			return res.redirect(`/trace?id=${factures[0].id}`)
		}

		console.log("LA", factures.length);

		return res.render('home', {
			error: true
		})
		
	}
)

app.get('/trace', 
	async (req, res) => {
		const {id} = req.query

		const base = airtable.base(baseName.executionLogistique)
		const facture = await base("Ventes").find(id)
	
		const lotRecors = await Promise.all(
			facture.fields["Production Lots"].map(lot_number=>{
				return base("Production Lots").find(lot_number)
			})
		)

		let camionIds = []
		for(lot of lotRecors){
			console.log("Sur le lot", lot);
			for(achatBrousseId of lot.fields["Achats brousse"]){
				camionIds.push(achatBrousseId)
			}
		}
		camionIds = [...new Set(camionIds)];
		let camions = [];
		for(camionId of camionIds){
			let camion = await base("Achats brousse").find(camionId)
			camions.push(camion)
		}


		if(req.query.json){
			return res.json({
				lotRecors,
				facture,
				camions
			})
		}
		return res.render('trace', {
			facture, 
			camions,
			lots: lotRecors
		})

	}
)
app.get('/', (req, res) => {
	return res.render('home', {
	})
});

app.listen(port, () => {
	console.log('Server app listening on port ' + port);
});