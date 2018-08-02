angular.module('userConfigMod', [])

.controller('userViewCtrl', ['$scope', 'userTable', 'userManager', '$$msgbox', function($scope, userTable, userManager, msgbox){

	$scope.$$msgbox = msgbox;
	$scope.userTable = userTable
	$scope.userManager= userManager	

	userTable.getUsers();
}])

.service('userManager',['userTable', '_client', '$$db', '$$msgbox', function(userTable, _client, db, msgbox){

	var userManager = this
	userManager.addUser = addUser;	
	userManager.removeUser = removeUserMsg;

	userManager.newUser = {
		username:'',
		user_type:'',
		access_level:0		
	} 

	function clearNewUser(){
		var pNames = Object.getOwnPropertyNames(userManager.newUser);
		for (var i = 0; i < pNames.length; i++) {
			userManager.newUser[pNames[i]] = ''
		}
	}

	function addUser(){
		if(userManager.newUser.username === '' || userManager.newUser.user_type === '' || userManager.newUser.access_level === ''){
			msgbox.showMsg('All new user inputs is required!')
			return false
		}

		var request = _client.generateRequestObj('addUser in userManager in userConfigMod in user-config.js');
		request.mongoQuery.insert = userManager.newUser;

		db.collection('users').insert(request, function(data){
			console.log(data);
			userTable.getUsers();
			clearNewUser();
		})
	}	

	function removeUserMsg(user){
		msgbox.button1.caption = 'Yes';
		msgbox.button1.clickAction = function(){
			removeUser(user);
		}

		msgbox.button2.caption = 'No';
		msgbox.button2.show = true;

		msgbox.showMsg('Are you sure you want to remove this user? (username:' + user.username + ')')
	}

	function removeUser(user){
		var request = _client.generateRequestObj('addUser in userManager in userConfigMod in user-config.js');

		request.mongoQuery.find = {_id:user._id}
		request.parse_id = true;

		db.collection('users').delete(request, function(data){
			console.log(data);
			userTable.getUsers();
		})
	}
}])	

.service('userTable', ['_client', '$$db', function(_client, db){

	var userTable = this;
	userTable.getUsers = getUsers;

	userTable.data = [];
	userTable.headers = [
		{
            pName:'username',
            fieldName:'Username',               
            processData: function(data){
                return data;
            }
        },
        {
            pName:'user_type',
            fieldName:'User Type',               
            processData: function(data, json){
                return data;
            }
        },
        {
            pName:'access_level',
            fieldName:'Access Level',
            processData: function(data, json){
                return data
            }
        }        
	];


	function getUsers(){
		var request = _client.generateRequestObj('getUsers in userTable in userConfigMod in user-config.js')

		request.mongoQuery.find = {};
		db.collection('users').find(request, function(data){
			userTable.data = data;			
		})
	}
}])