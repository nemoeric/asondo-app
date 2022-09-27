const express 	= require('express');
const app 			= express();
const port			= process.env.PORT || 3000;
var path 				= require('path');

var bodyParser 											= require('body-parser')
var cookieParser                    = require('cookie-parser');

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(cookieParser());

const airtable = require('./utils/airtable')
var { Liquid } = require('liquidjs');
var engine = new Liquid();
engine.registerFilter('upper', v => v.toUpperCase());
engine.registerFilter('kg', value => {
	return parseInt(value).toLocaleString('fr-FR') + " kg"
});
app.engine('liquid', engine.express()); 
app.set('views', './views');            // specify the views directory
app.set('view engine', 'liquid');       // set liquid to default
app.use("/public", express.static(path.join(__dirname, 'public')));
const authMiddleWare = require('./middlewares/auth')


app.post('/login',
	async (req, res) => {	
		const {executionLogistique} = require('./utils/airtable')
		const clients = await executionLogistique("Clients").select({
			filterByFormula: `{Email contact commercial} = '${req.body.email}' `
		}).all()

		if(!clients.length){
			return res.render('home', {
				error: true
			})
		}

		const client = clients[0];
		console.log("client", client);
		console.log(client.fields["Mot de passe traçabilité"]);
		console.log(req.body.password);

		if(client.fields["Mot de passe traçabilité"] == req.body.password){

			res.cookie('user_id', 
				client.id, 
				{ expires: new Date(Date.now() + (3600000)) }
			)
			return res.redirect(302, "/invoices")
		}

		return res.render('home', {
			error: true
		})
		
	}
)


app.post('/trace',
	authMiddleWare,
	async (req, res) => {
		const factures = await req.executionLogistique("Ventes").select({
			filterByFormula: `Numero = '${req.body.number}' `
		}).all()

		console.log("ICI", factures);
		
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
	authMiddleWare,
	async (req, res) => {
		const {id} = req.query

		const facture = await req.executionLogistique("Ventes").find(id)
	
		const lotRecors = await Promise.all(
			facture.fields["Production Lots"].map(lot_number=>{
				return req.executionLogistique("Production Lots").find(lot_number)
			})
		)



		let camionIds = []
		let achatBrousseDetailIds = []
		for(lot of lotRecors){
			// console.log("Sur le lot", lot);
			for(camion_id of lot.fields["Achats brousse"]){
				camionIds.push(camion_id)
			}
			for(achat_brousse_id of lot.fields["Achats brousse détail"]){
				achatBrousseDetailIds.push(achat_brousse_id)
			}

		}
		camionIds = [...new Set(camionIds)];
		let camions = [];
		let achatBrousseDetails = []
		for(camionId of camionIds){
			let camion = await req.executionLogistique("Achats brousse").find(camionId)
			camions.push(camion)
		}
		for(achat_detail_id of achatBrousseDetailIds){
			let one = await req.executionLogistique("Achats brousse").find(achat_detail_id)
			achatBrousseDetails.push(one)
		}

		// SUR LE LOT, j'ai le "Poids net" 
		// la sommes des achats brousses détails = le poid net

		if(req.query.json){
			return res.json({
				lots: lotRecors,
				facture,
				camions,
				achatBrousseDetails
			})
		}
		return res.render('trace', {
			facture, 
			camions,
			lots: lotRecors,
			achatBrousseDetails
		})

	}
)

app.get('/',
	(req, res) => {
		let user_id = req?.cookies["user_id"] || null
		if(user_id){
			return res.redirect("/invoices")
		}
		return res.render('home')
});

app.get('/invoices', 
	authMiddleWare,
	async (req, res) => {
		// console.log("ici?");
		const {client} 		= req
		const invoices 		= await req.executionLogistique("Ventes").select({
			filterByFormula: ` SEARCH("${client.fields.Name}", ARRAYJOIN(CLIENT)) ` 
		}).all()

		const contracts 		= await req.executionLogistique("Contrats de vente").select({
			filterByFormula: ` SEARCH("${client.fields.Name}", ARRAYJOIN(CLIENT)) ` 
		}).all()

		console.log(contracts);
		// console.log("invoices", invoices.length);
		return res.render('invoices', {
			invoices,
			contracts
		})

	}
)

app.listen(port, () => {
	console.log('Server app listening on port ' + port);
});