contract Sentigraph {
	struct Graphdata {
		string distance;
		bool flag;
	}

	mapping (uint => Graphdata) public records;

	function Sentigraph() {
	}

	function addRecord(uint d, string q) {
		records[d] = Graphdata({
			distance : q,
			flag : true
		});
	}

	function searchRecords(uint d) constant returns (string) {
		if (records[d].flag) {
			return records[d].distance;
		} else {
			return "-1";
		}
	}
}
