const AWS = require('aws-sdk');

const s3 = new AWS.S3();

module.exports.save = (name, data, callback) => {
	let params = {
		Bucket: 'pizza-luvrs-justin-bond',
		Key: `pizzas/${name}.png`,
		Body: new Buffer(data, 'base64'),
		ContentEncoding: 'base64',
		ContentType: 'image/png'
	};

	s3.putObject(params, (err,data) => {
		callback(err, `//s3-us-west-1.amazonaws.com/pizza-luvrs-justin-bond/${params.Key}`);
	});
};