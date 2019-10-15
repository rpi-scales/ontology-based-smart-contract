package helloworld

class HelloController {

    def index() 
		{	
				render "java -jar swrlapi-example-2.0.6-jar-with-dependencies.jar CourseSelectionOntology.owl".execute().text
//				render "Hello World!" 
		
				//["cd CourseSelectionExample", "mvn clean install","mvn exec:java  -Dexec.args=\"CourseSelectionOntology.owl\""].execute()
		}
}
