
   		var socketnot = io();

   		socketnot.on('show_notification', function (data) {
   			showDesktopNotification(data.title, data.message, data.icon);
   		})

		function setNotificationWithParameters(){
	   		var titulo =document.getElementById("title").value;
	   		console.log(">>>>>>>>>>>>>>>>>>"+titulo);
	   		setNotification(titulo,body);
	   	}

		//const titulo = '#title';
   		function setNotification(titulo,body) {
   		//	titulo : titulo.value
   			//showDesktopNotification('Aa', 'aaa','index.jpg')
   			//sendNodeNotification('Aa', 'aaa','index.jpg')
   			sendNodeNotification(titulo, 'aaaa','index.jpg')
   			console.log('el titulo es' + titulo)
   		}

   		var Notification = window.Notification || window.mozNotification || window.webkitNotification;
   		Notification.requestPermission(function (permission){

   		});

   		function requestNotificationPermissions(){
   			if (Notification.permission !== 'denied') {
		   		Notification.requestPermission(function (permission){

		   		});
   			}
   		}

   		function showDesktopNotification (message,body,icon,sound,timeout) {
   			if (!timeout) {
   				timeout = 4000;
   			}
   			requestNotificationPermissions();
   			var instance = new Notification(
   					message, {
   						body: body,
   						icon: icon,
   						sound: sound
   					}
   				);
   			instance.onclick = function(){};
   			instance.onerror = function(){};
   			instance.onshow = function(){};
   			instance.onclose = function(){};
   		}

   		function sendNodeNotification(title, message, icon) {
   			socketnot.emit('new_notification', {
   				message: message,
   				title: title,
   				icon: icon,
   			});
   		}