from flask import Flask, jsonify, request
import numpy as np

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json.get('features')
    # dummy model
    return jsonify({'score': float(np.random.rand())})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
