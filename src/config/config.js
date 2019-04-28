process.env.PORT = process.env.PORT || 3000;
process.env.NODE_ENV = process.env.NODE_ENV || 'local';

let urlDB
if (process.env.NODE_ENV === 'local'){
	urlDB = 'mongodb://localhost:27017/nodonode';
}
else {

	urlDB = 'mongodb+srv://admin:nodonode@nodonode-5w6kb.mongodb.net/test?retryWrites=true'
}

process.env.URLDB = urlDB


process.env.SENDGRID_API_KEY='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';