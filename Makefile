install:
	pip install -r requirements.txt

run:
	python -m flask run --port=3000
	python app.py