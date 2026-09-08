Hey this is about the network security and its automation

To run the project you have to follow some steps 

activate the virtual environment

```.\.venv\Scripts\Activate.ps1```

Apply the migrations 

```python manage.py migrate```

Run the server

```python manage.py runserver```

and now test the upload 

```curl.exe -X POST "http://127.0.0.1:8000/api/uploads/" -F "config=@sample_config.txt" -F "vendor=cisco"```
or 
```curl -X POST "http://127.0.0.1:8000/api/uploads/" -F "config=@sample_config.txt" -F "vendor=cisco"```

and you will get the response 

``` python view_report.py (id of the response )```

for checking the RAG 

Go the rag folder and run the following command

``` python index.py --wipe ```

this will clear the previous data and start the indexing process

for testing the RAG chatbot 

``` python rag_chatbot.py "query to the chatbot " ```