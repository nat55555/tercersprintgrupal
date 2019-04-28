require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const path = require('path');
const hbs = require('hbs');
const mongoose = require('mongoose'); 
const multer  = require('multer');
const server = require('http').createServer(app);

const io = require('socket.io')(server);


app.use(bodyParser.urlencoded({extended : false}));

// parse application/json 
app.use(bodyParser.json())



const dirPublic = path.join(__dirname, "../public")
app.use(express.static(dirPublic))




const servicioUsuario = require('./servicios/servicioUsuario');
const servicioCursos = require('./servicios/serviciodecursos');
const servicioInscripcion = require('./servicios/servicioInscripcion');

const session = require('express-session');

const bcrypt = require('bcrypt');

//sendgrip

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//const sgMail = require('@sendgrid/mail')('SENDGRID_API_KEY');


const directorioPublico = path.join(__dirname ,'../public');
const directorioPartials = path.join(__dirname ,'../partials');
const directorioHelpers = path.join(__dirname ,'../helpers');



app.use(express.static(directorioPublico));

var upload = multer({ })

app.use(session({
  secret: 'nodonode ultra secret',
  resave: false,
  saveUninitialized: true
}));

hbs.registerPartials(directorioPartials);
//hbs.registerHelpers(directorioHelpers);

// requires para trabajar con mongoose
const UsuarioMongo  = require('./models/usuarios');
const CursoMongo  = require('./models/cursos');
const InscripcionMongo  = require('./models/inscripciones');


const salt = 10;







app.set('view engine', 'hbs');


 app.get('/', (req,res) => {
	res.render('index');
}); 

app.get('/login', (req,res) => {
	res.render('login');
}); 

app.post('/login', (req,res) => {

    UsuarioMongo.findOne({id : req.body.id},(err,respuesta)=>{
    	let fotousuario;
    	let isImagenUsuario=false;
					if (err){
						return console.log(err)
					}else{

							let mensajeError;
							if(!respuesta){
								pagina = 'login';
								mensajeError = 'Identificacion o clave incorrectos';
							}
							else{

								if(!bcrypt.compareSync(req.body.pass, respuesta.clave)){
									pagina = 'login';
									mensajeError = 'Identificacion o clave incorrectos';
								}else{
									pagina = 'index';
									let auth = {};
									auth.id = respuesta.id;
									auth.rol = respuesta.rol;
									auth.nombre = respuesta.nombre;
									auth.isAdmin = respuesta.rol == 'coordinador';
									auth.isAspirante = respuesta.rol == 'aspirante';
									auth.isDocente = respuesta.rol == 'docente';									
									auth.isEnSession = true;
									
									try{
									    // file not presenet
									    fotousuario=respuesta.foto.toString('base64');
									    isImagenUsuario=true;
									} catch (err){
									    console.log('fallo la lectura de la imagen');
									}
									
									req.session.auth = auth;
									
								}
								
							}


							res.render(pagina, {
								errorMsg : mensajeError,
								auth : req.session.auth,
								fotousuario :fotousuario,
								isImagenUsuario:isImagenUsuario
							});


					}


	});

	
}); 

app.get('/logout', (req,res) => {
	req.session.destroy((err) => {
		if(err){
				console.log(err);
		}
	});
	res.render('index');
}); 

app.get('/crearUsuario', (req,res) => {

		UsuarioMongo.findOne({id : req.query.id},(err,respuesta)=>{
					if (err){
						return console.log(err)
				}


				res.render('crearUsuario', {
					usuario : respuesta,
					auth : req.session.auth
		});
	});
}); 


app.post('/crearUsuario',  upload.single('archivo'),(req,res) => {
	var file = req.file;
	var fotoinput ;
	var existefile=false;
		
		if ( file == null) {
		    console.log('no hay foto para el usuario');
		}else{
			 console.log('existe foto de usuario');
			existefile=true;
			fotoinput= req.file.buffer;
		}
	
	
	let usuarioMongo = new UsuarioMongo ({
	  	id: parseInt(req.body.id),		
		nombre: req.body.nombre,
		correo: req.body.correo,
		telefono: req.body.telefono,					
		clave: bcrypt.hashSync(req.body.clave,salt),	
	    rol: 'aspirante',
    	foto: fotoinput
	    	
   	})

	const mail = {
	  to:  req.body.correo,
	  from: 'nodonode@nodonode.com',	  
	  subject: 'Bienvenido a la plataforma Gestión Cursos!!!!!',
	  text: 'La cuenta fue creada',
	  html: '<strong>Ya puedes usar la plataforma para inscribirte a cursos de educación continua y gestionar tus inscripciones.</strong>'
	};

	usuarioMongo.save((err, resultado) => {
		if (err){
			msg = err;
			}	
		else{
		msg = 'Usuario creado';

		sgMail
		  .send(mail, (error, result) => {
		    if (error) {
		      //Do something with the error
		      console.log('algo fallo en el envio de correo de creacion del usuario');
		      console.log(error);		      
		    }
		    else {
		      //Celebrate
		    }
		  });
	 }
	    res.render('crearUsuario', {
		error : msg,
		auth : req.session.auth
	    });	

	}); 
}); 

app.get('/subirfoto',  upload.single('archivo'),(req,res) => {
			res.render('subirfoto', {
					  	auth : req.session.auth

					    
			});

}); 


app.post('/subirfoto',  upload.single('archivo'),(req,res) => {
	console.log('===== cargando foto');
	console.log('===== req.session.auth='+req.session.auth);
	console.log('===== req.session.auth.id='+req.session.auth.id);

	req.session.auth
	var file = req.file;
	var fotoinput ;
	var existefile=false;
		
		if ( file == null) {
		    console.log('no hay foto para el usuario');
		}else{
			 console.log('existe foto de usuario');
			existefile=true;
			fotoinput= req.file.buffer;
		}
	
	//foto: fotoinput
	//****************************
			UsuarioMongo.findOneAndUpdate({id: req.session.auth.id}, 
											{$set: {foto: fotoinput}}, 
											{new : true}, (err, resultados) =>{	
				if (err){
						res.render('subirfoto', {
						error : 'error en la consulta del usuario',
						auth : req.session.auth
					    });

				}	

				if (!resultados){
					res.render('subirfoto', {
							  	auth : req.session.auth,
							    error : 'no se encontro con el usuario'
					});						
				}
				else{

					res.render('subirfoto', {
							  	auth : req.session.auth,
							    error : 'se cargo la foto con exito, por favor vuelva a iniciar sesion para ver los cambios'
					});
		        }

		     });
	//// **************
}); 

app.get('/listarUsuarios', (req,res) => {
	verificarAcceso(req.session.auth, '/listarUsuarios', res);


	UsuarioMongo.find({},(err,respuesta)=>{
		if (err){
			return console.log(err)
		}

		res.render ('listaUsuarios',{
			listausuarios : respuesta,
			auth : req.session.auth			
		})
	})

});



app.post('/actualizarUsuario', (req,res) => {
	verificarAcceso(req.session.auth, '/actualizarUsuario', res);


	       //Estudiante.findById(req.session.usuario, (err, usuario) =>{
			//UsuarioMongo.findById(req.id, (err, usuario) =>{

			UsuarioMongo.findOneAndUpdate({id: req.body.id}, req.body , {new : true}, (err, resultados) =>{	
					if (err){

								res.render('crearUsuario', {
								usuario : resultados,
								error : err,
								auth : req.session.auth
							    });


					}	


					if (!resultados){
						msg = 'El usuario con ID ' + req.body.id + ' no existe en el sistema, no se puede actualizar!';
						res.render('crearUsuario', {
								  	usuario : resultados,  // resultados es el valor que esta trayendo de la DB
								  	auth : req.session.auth,
								    error : msg
						});						
					}
					else{

						msg = 'Usuario ' + req.body.id + ' actualizado exitosamente';
						res.render('crearUsuario', {
								  	usuario : resultados,  // resultados es el valor que esta trayendo de la DB
								  	auth : req.session.auth,
								    error : msg
						});
			        }

		     });
	
}); 

app.post('/actualizarcurso', (req,res) => {
	console.log('==========================================');
	console.log('======== actualizarcurso =============');
	verificarAcceso(req.session.auth, '/actualizarcurso', res);

			CursoMongo.findOneAndUpdate({id: req.body.id}, req.body , {new : true}, (err, respuesta) =>{	
					if (err){
						console.log('======== en el error =============');
						res.render ('crearcurso',{
							curso : respuesta,
							mensajeError : msg,
							auth : req.session.auth			
						});
					}	


					if (!respuesta){
						console.log('======== no hay resultados =============');
						msg = 'El curso con ID ' + req.body.id + ' no existe en el sistema, no se puede actualizar!';
						res.render ('crearcurso',{
							curso : respuesta,
							mensajeError : msg,
							auth : req.session.auth			
						});					
					}
					else{
						console.log('======== se actualizo =============');
						msg = 'Curso ' + req.body.id + ' actualizado exitosamente';
						res.render ('crearcurso',{
							curso : respuesta,
							mensajeError : msg,
							auth : req.session.auth			
						});	
			        }

		     });
	
}); 
app.get('/listar', (req,res) => {
	verificarAcceso(req.session.auth, '/listar', res);
	
	//listar cursos disponibles
	CursoMongo.find({'estado': 'disponible'},(err,respuesta)=>{
		if (err){
			return console.log(err)
		}

		res.render ('listarcursos',{
			listacursos : respuesta,
			auth : req.session.auth			
		})
	})

});


app.get('/listartodos', (req,res) => {
	verificarAcceso(req.session.auth, '/listartodos', res);

	//listar cursos disponibles
	CursoMongo.find({},(err,respuesta)=>{
		if (err){
			return console.log(err)
		}

		res.render ('listarcursostodos',{
			listacursos : respuesta,
			auth : req.session.auth			
		})
	})

});

app.get('/crear', (req,res) => {
	verificarAcceso(req.session.auth, '/crear', res);
	//********
	//listar  1 curso
	CursoMongo.findOne({'id': req.query.id},(err,respuesta)=>{
		if (err){
			return console.log(err)
		}

		res.render ('crearcurso',{
			curso : respuesta,
			auth : req.session.auth			
		})
	})

	///*********************
	// res.render('crearcurso', {
		// auth : req.session.auth
	// });

}); 

app.post('/crear', (req,res) => {
	verificarAcceso(req.session.auth, '/crear', res);

		let cursoMongo = new CursoMongo ({
		id: parseInt(req.body.id),		
		nombre: req.body.nombre,
		descripcion: req.body.descripcion,
		valor: req.body.valor,					
		modalidad: req.body.modalidad,	
		intensidad: req.body.intensidad,	
		estado: 'disponible'		  
	    })

	cursoMongo.save((err, resultado) => {
		if (err){
			msg = err;
			}	
		else{
			msg = 'Curso ' + req.body.id + ' creado exitosamente';
	        }
	 
	    res.render('crearcurso', {
		mensajeError : msg,
		auth : req.session.auth
	    });	

	}); 	

}); 

app.get('/detallecurso', (req,res) => {

	verificarAcceso(req.session.auth, '/detallecurso', res);

	//listar detalle de 1 curso
	CursoMongo.findOne({'id': req.query.id},(err,respuesta)=>{
		if (err){
			return console.log(err)
		}

		res.render ('detallecurso',{
			curso : respuesta,
			auth : req.session.auth			
		})
	})


}); 


app.get('/inscribirACurso', (req,res) => {

	verificarAcceso(req.session.auth, '/inscribirACurso', res);


	//listar cursos disponibles
	CursoMongo.find({'estado': 'disponible'},(err,respuestacursos)=>{
		if (err){
			return console.log(err)
		}

			let listacursos = respuestacursos;

								UsuarioMongo.find({},(err,respuestausuarios)=>{
									if (err){
										return console.log(err)
									}

									let	listausuarios = respuestausuarios;

													res.render('inscribirseCurso',{
														listacursos : listacursos,
														listausuarios: listausuarios,
														auth : req.session.auth
													});


								})

	})


		

}); 

app.post('/inscribirACurso', (req,res) => {
	verificarAcceso(req.session.auth, '/inscribirACurso', res);


	InscripcionMongo.findOne({'curso': req.body.nombrecurso},(err,respuesta)=>{

		let msg;
		let usuarios = [];
		if (err){
			return console.log(err)
		}
	
				if(!respuesta){
				  console.log ('noexiste registro de inscripcion para ese curso');
				
				  usuarios.push(  req.body.nombreuser	);
									let inscripcionMongo = new InscripcionMongo ({
									curso: parseInt(req.body.nombrecurso),		
									usuarios: usuarios  
								    })
									//inscripcionMongo.usuarios = {'usuarios' : usuarios };


								inscripcionMongo.save((err, resultado) => {
									if (err){
										msg = err;
										}	
									else{
										msg = 'inscripcion de ' + req.body.nombreuser + ' creada exitosamente';
								        }
							  				 	return res.render('inscribirseCurso',{
												//LIacursos : listacursos,
												nombreuser: parseInt(req.body.nombreuser),		
												nombrecurso: req.body.nombrecurso,
												mensajeError : msg,
												auth : req.session.auth
												});	

								})

								
					


				}
				else{ 
				  console.log ('SI HAY registro de inscripcion para ese curso');
				  			//InscripcionMongo.findOne({'curso': req.body.nombrecurso, 'usuarios': { "$in" : [req.body.nombreuser]} },(err,respuesta)=>{
				  			//InscripcionMongo.findOne(  { 'usuarios':  req.body.nombreuser } , (err,respuesta)=>{	
				  			InscripcionMongo.findOne( { $and: [ { 'curso': req.body.nombrecurso }, { 'usuarios': { $in : [req.body.nombreuser]} } ] } ,(err,respuesta)=>{	

				  				
				  				if(respuesta){
				  				 	msg = 'usuario ya esta matriculado en ese curso, no se puede matricular de nuevo';
				  				 	return res.render('inscribirseCurso',{
									//LIacursos : listacursos,
									nombreuser: parseInt(req.body.nombreuser),		
									nombrecurso: req.body.nombrecurso,
									mensajeError : msg,
									auth : req.session.auth
									});


				  				}else {
								    
		

				  					//InscripcionMongo.findOneAndUpdate({'curso': req.body.nombrecurso}, {$push: {'usuarios' : req.body.nombreuser}});
									
									InscripcionMongo.findOneAndUpdate({'curso': req.body.nombrecurso}, 
									                    {$push: {'usuarios': 
									                    req.body.nombreuser}}, 
									                    {new: true}, (err, result) => {
									                    		
									                   })									

									msg = 'usuario matriculado exitosamente!!'
											

				  				 	return res.render('inscribirseCurso',{
									//LIacursos : listacursos,
									nombreuser: parseInt(req.body.nombreuser),		
									nombrecurso: req.body.nombrecurso,
									mensajeError : msg,
									auth : req.session.auth
									});																			  						

				  				}



				  			})

				}										




	
	});		

			


});


app.get('/listarinscritos', (req,res) => {
	verificarAcceso(req.session.auth, '/listarinscritos', res);
	/*let listacursos = servicioCursos.mostrardisponibles();	
	let listausuarios = servicioUsuario.mostrar();
	let listainscritos = servicioInscripcion.mostrar();		
	let listainscritoslarge = servicioInscripcion.mostrarinscritos();
	res.render('listarinscritos',{
		listainscritoslarge : listainscritoslarge,
		auth : req.session.auth
	});*/

		//listar inscripciones disponibles

					/*			InscripcionMongo.aggregate([
								//	{
								//		$unwind: "$usuarios"
								//	}, {
								//		$group: {
								//			"_id": '$usuarios'
								//		}
								//	}, 
										//level-2 :titles 
										{ $lookup: { 
											from: 'CursoMongo', 
											localField: 'curso', 
											foreignField: 'id', 
											as: 'cursosjoin' }    
										},
										
																					//level-3 : issues
										{ $lookup: { 
												from: 'UsuarioMongo', 
												localField: 'usuarios', 
												foreignField: 'id', 
												as: 'usuariosjoin'},
										},
										{
												$unwind: "$usuarios"
										},																													
										{"$project":
										{
											"curso": 1,
											"usuariosjoin": {
												"nombre": 1,
												"coreo": 1
												}
										}
										}										
										//,
										//{$group: {_id:'curso'}}//,
										//{
										//		$unwind: "$usuariosjoin"
										//},											
    									//{ $unwind:"$CursoMongo", preserveNullAndEmptyArrays: true }, 
										//{$project: {'_id':0, idcurso: "$cursos.id", nombrecurso: "$cursos.nombre"}}
										//{$project: {'_id':0, idcurso: 1, nombrecurso: 1}}

										//, 
										//{
										//	$unwind: '$cursos'
										//}//,
										//{
										//	
										//		$match: {
										//			  'cursos.estado': 'disponible'
										//		}
											  
										//}
										//,

								])
							.exec(function (err, results)
						{
								if (err) return res.status(500).send("There was a problem finding the Issues.");
								if (!results) return res.status(404).send("No Issues found.");
								return console.log (results)
								return console.log ('reg'+ registro)

								res.render ('listarinscritos',{
									listainscritoslarge : results,
									auth : req.session.auth	

							}) */
	

						
				//-----------

			   
	//			   });

	InscripcionMongo.find( {} ,(err,respuesta)=>{
		let rta = [];
		
			if(err){
				return console.log("errorrrrrrrrrr");
			}

			if(respuesta){

			let fil = {};
			respuesta.forEach(fila => {
			
				let cursoId = fila.curso;

				CursoMongo.findOne({$and: [{'id': cursoId},{'estado': 'disponible'}]},(err,curso)=>{
					let inscrito = [];
					if (err){
						return console.log(err)
					}
			
					if(curso){
						
							fila.usuarios.forEach( usuarioId => {
								
								UsuarioMongo.findOne({id: usuarioId}, (err, usuario) =>{

												if(err){
													return console.log("errorrrrrrrrrr");
												}

									console.log("rta =" + rta);
								
									if(usuario){
									inscrito.push(usuario);	
								      /*  fil = {"curso" : curso.nombre, "idcurso" : curso.id, "inscrito" : inscrito};
										console.log("--------"+inscrito);
										rta.push(fil);*/

									}else {

									}					
									
								}	
								

								);
							})

							fil = {"curso" : curso.nombre, "idcurso" : curso.id, "inscrito" : inscrito};
							console.log("--------"+inscrito);
							rta.push(fil);
							
					}

					/* fil = {"curso" : curso.nombre, "idcurso" : curso.id, "inscrito" : inscrito};
							console.log("--------"+inscrito);
							rta.push(fil);*/
				})
				
			})
				setTimeout(function() {   
					res.render ('listarinscritos',{
					listainscritoslarge : rta,
					auth : req.session.auth			
					})
				 },2000);		
			
			} // FIN IF RESPUESTA



			//
		
			
	}	
	);


			
			});
	



app.get('/desinscribiracurso', (req,res) => {
	verificarAcceso(req.session.auth, '/desinscribiracurso', res);
	let listacursos = [];	
	let listausuarios =[];
    let listainscritoslarge = servicioInscripcion.mostrarinscritos();

 	UsuarioMongo.find({},(err,respuesta)=>{
		if (err){
			return console.log(err)
		}else{
			listausuarios = respuesta;
			console.log('buscando usuario:'+listausuarios)

			//listar cursos disponibles
			CursoMongo.find({},(err,respuestacursos)=>{
				if (err){
					return console.log(err)
				}
					listacursos = respuestacursos;
					console.log('buscando cursos:'+respuesta)
			});
		
			setTimeout(function() {    
				console.log('en el render')
				console.log('buscando listausuarios:'+listausuarios)
				console.log('buscando cursos:'+listacursos)
			    res.render('desinscribircurso',{
					listacursos : listacursos,
					listausuarios: listausuarios,
					listainscritoslarge : listainscritoslarge,
					auth : req.session.auth
				});
			},2000);
		}	
	});

});


app.post('/desinscribiracurso', (req,res) => {
	verificarAcceso(req.session.auth, '/desinscribiracurso', res);
	let msg = ' ';	
	let listacursos = [];	
	let listausuarios =[];
    let listainscritoslarge = servicioInscripcion.mostrarinscritos();
    console.log('req.body.nombreuser:'+req.body.nombreuser);
    console.log('req.body.nombrecurso'+req.body.nombrecurso);

	InscripcionMongo.updateOne( { 'curso' : req.body.nombrecurso}, { $pull: { 'usuarios' : req.body.nombreuser } }, (err,respuestapull)=>{
		if(err){
			msg='No se puedo realizar el procedimineto'
		}{
			msg='se elimino el curso correctamente'
			UsuarioMongo.find({},(err,respuesta)=>{
				if (err){
					return console.log(err)
				}else{
					listausuarios = respuesta;
					console.log('buscando usuario:'+listausuarios)

					//listar cursos disponibles
					CursoMongo.find({},(err,respuestacursos)=>{
						if (err){
							return console.log(err)
						}
							listacursos = respuestacursos;
							console.log('buscando cursos:'+respuesta)
					});
				
					setTimeout(function() {    
						console.log('en el render')
						console.log('buscando listausuarios:'+listausuarios)
						console.log('buscando cursos:'+listacursos)
						let listainscritoslarge = servicioInscripcion.mostrarinscritos();
					    res.render('desinscribircurso',{
							nombreuser: parseInt(req.body.nombreuser),		
							nombrecurso: req.body.nombrecurso,
							mensajeError : msg,
							listacursos : listacursos,
							listausuarios: listausuarios,
							listainscritoslarge : listainscritoslarge,
							auth : req.session.auth
						});
					},2000);
				}	
			});

		}
	});
});


app.get('/cerrarcurso', (req,res) => {	
	verificarAcceso(req.session.auth, '/cerrarcurso', res);

	//let curso = servicioCursos.cerrarcurso(req.query.id);
	//let listainscritoslarge = servicioInscripcion.mostrarinscritos();					
	//res.render('listarinscritos',{
	//	listainscritoslarge : listainscritoslarge,
	//	auth : auth
	//});


	CursoMongo.findOne({'id': req.query.id},(err,cursoacerrar)=>{
		if (err){
			return console.log(err)
		}

		UsuarioMongo.find({'rol': 'docente'},(err,respuestadocentes)=>{
			if (err){
				return console.log(err)
			}

			console.log(respuestadocentes)
			res.render ('cerrarcurso',{
				curso : cursoacerrar,
				listadocentes : respuestadocentes,
				auth : req.session.auth			
			})
		})	





	})// fin busqueda de curso




}); 

app.post('/cerrarcurso', (req,res) => {	
	verificarAcceso(req.session.auth, '/cerrarcurso', res);
	console.log('curso:'+req.body.nombrecurso)
	console.log('docente:'+req.body.nombredocente)
	let msg;

    CursoMongo.updateOne( { 'id' : parseInt(req.body.nombrecurso)}, { 'iddocente' : parseInt(req.body.nombredocente), 'estado' : 'cerrado' } , (err,respuestadocen)=>{
    	console.log('asignando docente')
    	if (err){
			return console.log(err)
		}else{
			console.log('respuestadocen:'+respuestadocen)
									msg = 'curso cerrado exitosamente!!, se asigno el docente' + req.body.nombredocente

					// codificacion para el enviando email a usuario
					
					let cursoid = req.body.nombrecurso;
					console.log('==================> cursoid='+cursoid)
					InscripcionMongo.findOne({'curso': cursoid},(err,respuestainscripciones)=>{
					if(err){
						 console.log(err)
					}else{
							console.log('==========>respuestainscripciones='+respuestainscripciones)
						    respuestainscripciones.usuarios.forEach(function(usuarioId) {
						    	console.log('==========>usuarioId='+usuarioId)
								//***
								UsuarioMongo.findOne({id: usuarioId}, (err, usuario) =>{

									if(err){
										return console.log("errorrrrrrrrrr");
									}

									if(usuario){
										let correousuario = usuario.correo;
						    			let nombreusuario =usuario.nombre
				  						console.log('==========>correousuario='+correousuario);
				  						console.log('==========>nombreusuario='+nombreusuario);
				  						const mail = {
								  				to:  correousuario,
								 				from: 'nodonode@nodonode.com',	  
								  				subject: 'asignacion de curso',
								  				text: 'La cuenta fue creada',
								  				html: '<strong>señor(a) '+nombreusuario+' el curso al cual se encuentra inscrito fue asignado a un docente,'+
								      			  'posteriormente se le informara la fecha de inicio del curso</strong>'
										};

										sgMail
								 			 .send(mail, (error, result) => {
											    if (error) {
											      //Do something with the error
											      console.log('algo fallo en el envio de correo');
											      console.log(error);		      
											    }
											    else {
											      console.log('se envio correo a la direccion='+correousuario);
											    }
											  });
									}				
								});//fin consulta de usuarios
								//**
							});//fin for each de ids de usuarios
				
							setTimeout(function() {
								console.log('=============   Termino     =====================')
							},2000);
						}
					});	// fin buscar inscripciones	

					// codificacion para enviar mail al docente

											UsuarioMongo.find({'nombre': req.body.nombredocente},(err,respuesta)=>{
												if (err){
													return console.log(err)
												}

												if (respuesta){

													const mailcursocerrado = {
													  to:  respuesta.correo,
													  from: 'nodonode@nodonode.com',	  
													  subject: 'Se le ha asignado un curso',
													  text: 'Se le ha asignado un curso',
													  html: '<strong>Señor Profesor(a), <br> <br>  con este corre queremos informarle que las inscripciones para el curso </strong>' + req.body.nombrecurso + '<strong>cerraron exitosamente y usted fue asignado como docente del curso.</strong>'
													};

														sgMail
														  .send(mailcursocerrado, (error, result) => {
														    if (error) {
														      console.log('algo fallo en el envio de correo al docente del curso');
														      console.log(error);		      
														    }
														    else {
														      //Celebrate
														    }
														  });													

												}
											})		



		}

    });





	CursoMongo.findOne({'id': req.query.id},(err,cursoacerrar)=>{
		if (err){
			return console.log(err)
		}

						UsuarioMongo.find({'rol': 'docente'},(err,respuestadocentes)=>{
							if (err){
								return console.log(err)
							}
								console.log(respuestadocentes)
								res.render ('cerrarcurso',{
									curso : cursoacerrar,
									listadocentes : respuestadocentes,
									mensajeError : msg,
									auth : req.session.auth			
								})
						})			


	})


}); 


app.get('/eliminarinscripcion', (req,res) => {
	verificarAcceso(req.session.auth, '/eliminarinscripcion', res);

	let eliminarinscripcion = servicioInscripcion.eliminar();
	let curso = servicioInscripcion.eliminar(req.query.iduser,req.query.idcurso);
	let listainscritoslarge = servicioInscripcion.mostrarinscritos();	
    
    InscripcionMongo.updateOne( { 'curso' : req.query.idcurso}, { $pull: { 'usuarios' : req.query.iduser.toString() } }, (err,respuestapull)=>{
		if(err){
			return console.log(err)
		}else{
			//*********************
				InscripcionMongo.find( {} ,(err,respuesta)=>{
					let rta = [];
		
					if(err){
						return console.log("errorrrrrrrrrr");
					}

					if(respuesta){

						let fil = {};
						respuesta.forEach(fila => {
			
							let cursoId = fila.curso;

							CursoMongo.findOne({$and: [{'id': cursoId},{'estado': 'disponible'}]},(err,curso)=>{
								let inscrito = [];
								if (err){
									return console.log(err)
								}
				
								if(curso){
							
									fila.usuarios.forEach( usuarioId => {
									
										UsuarioMongo.findOne({id: usuarioId}, (err, usuario) =>{

											if(err){
												return console.log("errorrrrrrrrrr");
											}

											console.log("rta =" + rta);
									
											if(usuario){
											inscrito.push(usuario);	
									      /*  fil = {"curso" : curso.nombre, "idcurso" : curso.id, "inscrito" : inscrito};
											console.log("--------"+inscrito);
											rta.push(fil);*/

											}else {

											}					
										
										});
									})

									fil = {"curso" : curso.nombre, "idcurso" : curso.id, "inscrito" : inscrito};
									console.log("--------"+inscrito);
									rta.push(fil);
								
								}

								/* fil = {"curso" : curso.nombre, "idcurso" : curso.id, "inscrito" : inscrito};
								console.log("--------"+inscrito);
								rta.push(fil);*/
							})// fin CursoMongo.findOne
				
						})//---------
					setTimeout(function() {    	
						res.render ('listarinscritos',{
						listainscritoslarge : rta,
						auth : req.session.auth			
						})
					},2000);			
			
					} // FIN IF RESPUESTA
				});


			//*************			
			
			} 
		
		
	});

}); 

app.get('/listarmiscursos', (req,res) => {
	verificarAcceso(req.session.auth, '/listarmiscursos', res);

	let listaincripciones = [];
	let miscursoslist=[];
	let usuarioslist= [];

	InscripcionMongo.find({},(err,respuestainscripciones)=>{
		if(err){
			 console.log(err)
		}else{
			listaincripciones = respuestainscripciones;
			listaincripciones.forEach(function(element) {
	  			usuarioslist=element.usuarios;
	  			usuarioslist.forEach(function(usuariocurso){
	  				if(usuariocurso==req.session.auth.id){
						CursoMongo.findOne({'id': element.curso},(err,respuestacursos)=>{
							if(err){
								 console.log(err)
							}else{
								miscursoslist.push(respuestacursos);
							}
						});
	  				}
	  			});
			});
		
			setTimeout(function() {
				res.render('listarmiscursos',{
				listacursosusuario : miscursoslist,
				auth : req.session.auth
				});
			},2000);

		}
		
		

	});

});



app.get('/eliminarmicurso', (req,res) => {
	verificarAcceso(req.session.auth, '/eliminarmicurso', res);
	console.log('***  eliminarmicurso')
	console.log('***  curso:'+req.query.idcurso+' usuario:'+req.session.auth.id.toString())
	console.log('***  eliminarmicurso')

	let listaincripciones = [];
	let miscursoslist=[];
	let usuarioslist= [];
	// eliminado curso
	    InscripcionMongo.updateOne( { 'curso' : req.query.idcurso}, { $pull: { 'usuarios' : req.session.auth.id.toString() } }, (err,respuestapull)=>{
    	console.log('eliminando');
    	if(err){
			return console.log(err)
		}else{
			console.log('=============== respuestapull'+respuestapull);

			InscripcionMongo.find({},(err,respuestainscripciones)=>{
				if(err){
					return console.log(err)
				}else{
					listaincripciones = respuestainscripciones;
					listaincripciones.forEach(function(element) {
			  			usuarioslist=element.usuarios;
			  			usuarioslist.forEach(function(usuariocurso){
			  				if(usuariocurso==req.session.auth.id){
								CursoMongo.findOne({'id': element.curso},(err,respuestacursos)=>{
									if(err){
										return console.log(err)
									}else{
										miscursoslist.push(respuestacursos);
									}
								});
			  				}
			  			});
					});
				
					setTimeout(function() {
						res.render('listarmiscursos',{
						listacursosusuario : miscursoslist,
						auth : req.session.auth
						});
					},2000);

				}
			});
		}
    });
}); 

app.get('/test', (req,res) => {
	verificarAcceso(req.session.auth, '/test', res);
		res.render('test',{
		auth : req.session.auth
		});
	});

app.get('/listarcursosdocente', (req,res) => {
	verificarAcceso(req.session.auth, '/listarcursosdocente', res);	

		//*********************
		InscripcionMongo.find( {} ,(err,respuesta)=>{
			let rta = [];

			if(err){
				return console.log("errorrrrrrrrrr");
			}

			if(respuesta){

				let fil = {};
				respuesta.forEach(fila => {
	
					let cursoId = fila.curso;

					console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaa ----------------------------->>>'+req.session.auth.id);
					let idDocente = req.session.auth.id;

					CursoMongo.findOne({$and: [{'id': cursoId},{'iddocente': idDocente},{'estado': 'cerrado'}]},(err,curso)=>{
						let inscrito = [];
						if (err){
							return console.log(err)
						}
		
						if(curso){
							console.log('====================================================================')
							console.log(curso)
							fila.usuarios.forEach( usuarioId => {
							
								UsuarioMongo.findOne({id: usuarioId}, (err, usuario) =>{

									if(err){
										return console.log("errorrrrrrrrrr");
									}

									console.log("rta =" + rta);
							
									if(usuario){
									inscrito.push(usuario);	
							      /*  fil = {"curso" : curso.nombre, "idcurso" : curso.id, "inscrito" : inscrito};
									console.log("--------"+inscrito);
									rta.push(fil);*/

									}else {

									}					
								
								});
							})

							fil = {"curso" : curso.nombre, "descripcion" : curso.descripcion, "modalidad" : curso.modalidad,
								   "intensidad" : curso.intensidad,"estado" : curso.estado, "idcurso" : curso.id, "inscrito" : inscrito};
							console.log("--------"+inscrito);
							rta.push(fil);
						
						}

					})// 
		
				});//---------
		
	
			} // FIN IF RESPUESTA

				setTimeout(function() {    	
				res.render ('listarcursosdocente',{
				listainscritoslarge : rta,
				auth : req.session.auth			
				})
			},4000);	
		});


	//*************			
			
}); 


app.get('/entrarachat', (req,res) => {
	verificarAcceso(req.session.auth, '/entrarachat', res);
	

		res.render ('entrarachat',{
			auth : req.session.auth		
		})


});

app.get('/enviarnotificaciones', (req,res) => {
	verificarAcceso(req.session.auth, '/enviarnotificaciones', res);
	

		res.render ('enviarnotificaciones',{
			auth : req.session.auth		
		})


});


app.get('/chat', (req,res) => {
	verificarAcceso(req.session.auth, '/chat', res);
	
		res.render ('chat',{
			auth : req.session.auth,
			usuarios: './usuarios',
			nombre: req.query.nombre			
		})

});


const { Usuarios } = require('./usuarios');
const usuarios = new Usuarios()

			io.on('connection', client => {                 // con esto el servidor  esta atento a que se realice una conexión.

				console.log("un usuario se ha conectado")
				//console.log("el nombre" + req.query.id)
				

				// client.emit("mensaje", "Bienvenido a mi página")

				// client.on("mensaje", (informacion) =>{
				// console.log(informacion)
				// })

				// client.on("contador", () =>{
				// 	contador ++
				// 	console.log(contador)
				// 	io.emit("contador", contador )
				// })

				client.on('usuarioNuevo', (usuario) =>{
					let listado = usuarios.agregarUsuario(client.id, usuario)
					console.log(listado)
					let texto = `Se ha conectado ${usuario}`
					io.emit('nuevoUsuario', texto )
				})

				//client.on('disconnect',()=>{
				//	let usuarioBorrado = usuarios.borrarUsuario(client.id)
				//	let texto = `Se ha desconectado ${usuarioBorrado.nombre}`
				//	io.emit('usuarioDesconectado', texto)
				//		})

				client.on("texto", (text, callback) =>{
					let usuario = usuarios.getUsuario(client.id)
					let texto = `${usuario.nombre} : ${text}`
					
					io.emit("texto", (texto))
					callback()
				})

				client.on("textoPrivado", (text, callback) =>{
					let usuario = usuarios.getUsuario(client.id)
					let texto = `${usuario.nombre} : ${text.mensajePrivado}`
					let destinatario = usuarios.getDestinatario(text.destinatario)
					client.broadcast.to(destinatario.id).emit("textoPrivado", (texto))
					callback()
				})

				// las notificaciones se tomaron de: https://xtreemsolution.com/blog/How-to-make-real-time-notification-system-using-socketio-and-nodejs
				client.on('new_notification', function(data) {
					console.log('mensaje' + data.title,data.message);
				    io.sockets.emit('show_notification', {
				    	title: data.title,
				    	message: data.message,
				    	icon: data.icon
				    });
				});				

				
			});




app.get('*', (req,res) => {
	res.render('index', {
		auth: req.session.auth
	});
});



let verificarAcceso = (auth, recurso, res) => { 
	rol = (auth  && auth.rol  )  ? auth.rol : 'interesado';
 	let puedeIngresar = servicioUsuario.verificarAcceso(rol,recurso);
 	if(!puedeIngresar){
 		res.redirect('/');
 	}
};


mongoose.connect(process.env.URLDB, {useNewUrlParser: true}, (err, resultado) => {
	if (err){
		return console.log(error)
	}
	console.log("conectado")
});

 
server.listen(process.env.PORT, () => {
	console.log('-------------------------------------------------- \n \n La aplicación está escuchando en el puerto ' + process.env.PORT + ' \n INGRESE A: http://127.0.0.1:' + process.env.PORT + '/ \n \n -------------------------------------------------- \n ')	
});
