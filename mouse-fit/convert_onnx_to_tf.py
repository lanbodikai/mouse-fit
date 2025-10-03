from onnx_tf.backend import prepare
import onnx

# Load ONNX model
onnx_model = onnx.load("runs/seg/mouse_seg_all2/weights/best.onnx")

# Convert to TensorFlow
tf_rep = prepare(onnx_model)

# Export to TensorFlow SavedModel format
tf_rep.export_graph("runs/seg/mouse_seg_all2/weights/saved_model")
