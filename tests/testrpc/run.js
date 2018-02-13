var TestRPC = require("ethereumjs-testrpc");
var server = TestRPC.server();
server.listen(8545, function(err, blockchain) {
	console.log(blockchain);
});
