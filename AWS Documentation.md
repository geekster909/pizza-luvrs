# Starter

##### Create VPC (menu option: VPC)
- pizza-vpc

##### Create Instance (menu option: EC2 -> Instances -> Instances)
- network: select pizza-vpc
- tag: name 'pizza-og'
- create security group
	- name: pizza-ec2-sg
	- rules: ssh, TCP, port: 22, source: anywhere
	- rules: customTCP, TCP, port:3000, source: anywhere
- Launch
- create new key pair
	- name: pizza-keys, save the .pem file

##### Create Public IP for instance (menu option: EC2 -> Network & Security -> Elastic IPs)
- "allocate new address"
- select newly created IP -> Actions -> Associate address
- select instance to associate the IP with

##### SSH to Instance
- Configure .pem file to use for SSH
	- command `chmod 400 <path-to-pem-file>`
		- `chmod 400 ~/Downloads/pizza-keys.pem`
	- command `ssh -i <path-to-pem-file> ec2-user@<ec2-ip>`
		- `ssh -i ~/Downloads/pizza-keys.pem ec2-user@52.8.35.219`
			- user 'ec2-user' is a default instance user

##### Update Instance and install Nodejs 
- SSH into instance
- To Update, run command `sudo yum update`
- Install Node, run command `curl --location https://rpm.nodesource.com/setup_6.x | sudo bash -`, then run command `sudo yum install -y nodejs`
	- run command `node -v` to insure node has been installed

##### Transfer application/code to Instance (do not copy node_modules folder)
- run command `scp -r -i <pem_file> <local_code> ec2-user@<ec2_ip>:/home/ec2-user/<app_name>`
	- `scp -r -i ~/Downloads/pizza-keys.pem ./pizza-luvrs ec2-user@52.8.35.219:/home/ec2-user/pizza-luvrs`
- SSH into instance
- cd into application directory (<app_name>)
- run `npm install` if needed
- run `npm start` to run application

##### Scaling EC2 Instance (EC2 Image)
- Select your Instance and go to Actions -> Images -> Create Image
- Image name: pizza-image

##### Create Load Balancer
- Create Load Balancer (classic HTTP)
- Load Balancer Name: pizza-loader
- Select VPC: pizza-vpc
- Instance Port: 3000
- select both subnets from VPC
- Next, Next
- Create new security group: pizza-lb-sg, TCP Port 80 Anywhere
- Health Checks
	- Protocol: HTTP
	- Post: 3000
	- Path: /
- Review, Create
- Enable Stickiness in details tab (enable load balancer generated cookie: 86400 "1 day")

##### Create Auto Scaling Group
- Create new Auto Scaling Group
- Choose AMI image created earlier and configure
- Create Launch Configuration
	- Name: pizza-launcher
	- Advanced Details for shell scripts
		```
		#!/bin/bash
		echo "starting pizza-luvrs"
		cd /home/ec2-user/pizza-luvrs
		npm start
		```
- Security Group: pizza-ec2-sg
- Create Launch Configuration
- Choose "pizza-keys" for key pair
- (That was to create the launch configuration)
- Create scaling group
- Group name: pizza-scaler
- Group size: 2 instances
- network: pizza-vpc
- Subnet: both subnets
- Load Balancing: checked
- Choose load balancer "pizza-loader"
- keep this group at its initial size
- no notifications
- create autoscaling group
- inside the instances tab, they should be "inService"
- get DNS name in decription tab (DNS CNAME)

##### Auto scaling
- go to Auto scaling groups and choose your group
- Select "scaling Policies" tab
- Click "Add policy" and then click "create a simple scaling policy"
- Name: scale up
- Create Alarm
- Take the action: add 1 instance
- Create Policy
- Add Policy for scaling down (remove 1 instance)
	- Name change to Low Network Out
- Click "details" tab
- edit max to 4 (for 4 instances)

#### S3

##### Creating a bucket
- create bucket
	- Bucket Name: pizza-luvrs-justin-bond (unique)
	- Add Region : N. Cali
	- create
- Go to Permissions
	- Go to Bucket Policy (we will be doing public access)
		- Go to Link (https://awspolicygen.s3.amazonaws.com/policygen.html)
		- Select type: S3 Bucket Policy
		- Principal: * (for every file/folder)
		- Actions: GetObject
		- ARN: arn:aws:s3:::<bucket_name>/<key_name> (arn:aws:s3:::pizza-luvrs-justin-bond/*)
		- Add Statement then Generate Policy since we only have one statement
		- Copy the json data
	- Paste the json data into the text area and click save (should see "public" in tab now)

##### Uploading objects (console: small # of files, CLI: bulk uploading, SDK: dynamic uploading in code)
- Console
	- aw s3 cp <local_folder> s3://<bucket><remote_folder> --recursive --exclude "<pattern>"
		- `aws s3 cp ./assets/js s3://pizza-luvrs-justin-bond/js --recursive --exclude ".DS_Store"`
		- `aws s3 cp ./assets/css s3://pizza-luvrs-justin-bond/css --recursive --exclude ".DS_Store"`
		- `aws s3 cp ./assets/pizzas s3://pizza-luvrs-justin-bond/pizzas --recursive --exclude ".DS_Store"`

##### Connecting with code
- get your bucket link (https://s3-us-west-1.amazonaws.com/pizza-luvrs-justin-bond/)
- replace all `/assets/` links with your s3 link without the protocol
	- `<img src="/assets/logo_header.png" class="logo" />` -> `<img src="//s3-us-west-1.amazonaws.com/pizza-luvrs-justin-bond/logo_header.png" class="logo" />`
- Add file `imageStoreS3` into folder `lib`
- Edit file `./lib/imageStore.js`
	- Add const `s3Store = require('./imageStoreS3');`
	- Edit `fileStore.save` function to `s3Store.save`
- Enable CORS
	- Go to the permissions tab in your bucket and click on "CORS configuration"
		- Add `<AllowedMethod>HEAD</AllowedMethod>` below AllowHeader
			- The above worked until AWS auto moved which line it is on, I had to remove the following line `<AllowedHeader>Authorization</AllowedHeader>`
	- click Save and it will be enabled

##### Redeploy code to EC2
- Update pizza-og instance with new code
	- use the `aws scp` command to upload new code (remember to remove the node_modules folder) 
	- ssh into ec2 instance and run `npm install`
- Select your pizza-og instance and click actions and create new image
	- Name this `pizza-plus-s3` and click create
- Create new IAM role
	- Go to Roles in your IAM service
	- Create new role
		- Choose EC2 service
		- Permissions: AmazonS3FullAccess
		- Role Name: pizza-ec2-role
		- Create Role
- Create new Launch configuration
	- Choose your newly create AMI `pizza-plus-s3`
	- Name: pizza-launcher-2
	- IAM Role: pizza-ec2-role
	- User Data: enter same bash command
		```
        #!/bin/bash
		echo "starting pizza-luvrs"
		cd /home/ec2-user/pizza-luvrs
		npm start
		```
	- IP Address Type: Assign a public IP address to every instance
	- Secrity Group: pizza-ec2-sg
	- Choose the pizza keys
- Update the auto scaling group to new launch configuration
	- Select `pizza-scaler` and click edit in the details section below
	- Change Launch configuration to the new `pizza-launcher-2`
- Update existing instances in the auto scaling group (easiest way is to terminate them)
	- Go to Instances
	- Select any instances that aren't called `pizza-og`
	- Click Actions -> Instance State -> Terminate

#### Databases

##### RDS
- Create the the DB
	- Go to RDS from the console
	- create new and select PostgreSQL
	- Choose Dev/Test
	- DB instance class: db.t2.micro
	- DB instance identifier: pizza-db
	- Set username/password
	- VPC: pizza-vpc
	- Public accessibility: Yes (production it should be set to No)
	- Database name: pizza_luvrs
	- Launch database
	- Once created go to the DB Instance and click on the Security groups link
	- Click on the "Inbound Tab" at the bottom
	- If you have trouble connecting ot the DB change the source to Anywhere
- Modify DB for this project
	- connect to DB and add another table called 
		- Name the table `pizzas`
		- Change the `id` column type to `text`
		- Create 7 new columns
			- `img`, `name`, `toppings`, `img`, `username`, `created`, `createdAt`, `updatedAt`
			- Set "created" type to `bigint` and "createdAt/UpdatedAt" to `timestamp with time zone`
		- Save changes
- Interacting code for RDS
(To Be Continued...)

#### Elastic Beanstalk & CloudFormation

##### CloudFormation
- Edit pizza.template around line 171 with your AMI name
- Go to CloudFormation and create a new stack
- Name: pizza-stack
- Create

##### Elastic Beanstalk
- go to Elastic Beanstalk
- Create new one
- Application name: pizza luvrs
- Create web server
- Select platform: Node.js
- Environment type: Load balancing, auto scaling
- upload your application in .zip (with node_modules, not the directory but the files inside the directory)
	- mac: `zip -r package.zip .`
- Deployment Preferences (default is ok)
- Check your environment URL and then click next
- Check the "create this ... VPC"
- EC2 key paid: pizza-keys
- Add email (optional)
- Application health Check URL: `/`
- Next
- Choose the correct VPC (unfortunately the name doesn't show, onlt the ID)
- Check the ELB and EC2 in the subnets where you want your instances
- VPC security group: pizza-ec2-sg
- Instance profile: pizza-ec2-role
- Launch
- You can check Logs by going to the tab Logs on the left side and see if you have any errors
- To change Configuration versions
	- Go to COnfigurations on the left side
	- Go to Server Configuration and you can change the "node version"
- Click the URL at the top to make sure your application is running correctly