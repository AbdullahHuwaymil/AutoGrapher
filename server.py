from flask import Flask, request, jsonify,Response,send_file, after_this_request,make_response
from flask import send_file
import tempfile
import os
from werkzeug.utils import secure_filename
from network_design_tool import NetworkDesignTool
from pathlib import Path
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import networkx as nx
from tempfile import NamedTemporaryFile
from network_design_tool import NetworkDesignTool
# CORS(app)  # This allows access from any domain
from flask_cors import CORS




import numpy as np  # type: ignore # Ensure numpy is imported
nd_tool = NetworkDesignTool()


app = Flask(__name__)
CORS(app)
current_graph_type = ""

@app.route('/api/update-graph-type', methods=['POST'])
def update_graph_type():
    global current_graph_type
    data = request.json
    new_graph_type = data.get('graphType')
    
    # Perform validation or any additional logic as needed
    if new_graph_type in ["directed", "undirected"]:
        current_graph_type = new_graph_type
        
        # Here, update the NetworkDesignTool instance's graph type.
        # This assumes you have a way to access or instantiate your NetworkDesignTool instance.
        # For a simple solution, you might keep a global instance, but consider
        # more robust state management for production applications.
        nd_tool.set_graph_type(new_graph_type)
        # nd_tool.reset_graph()
        # Respond with a success message
        return jsonify({'message': f'Graph type updated to {current_graph_type}'}), 200
    else:
        # Respond with an error message if the graph type is not valid
        return jsonify({'error': 'Invalid graph type'}), 400

@app.route('/api/reset-graph', methods=['POST'])
def reset_graph():
    global nd_tool  # Assuming nd_tool is your NetworkDesignTool instance
    data = request.json
    graph_type = data.get('graphType', 'undirected')  # Default to 'undirected' if not specified
    
    # Reset the graph and set its type
    nd_tool.reset_graph()
    nd_tool.set_graph_type(graph_type)
    
    return jsonify({'message': 'Graph reset successfully'}), 200

@app.route('/api/add-node', methods=['POST'])
def add_node_route():
    data = request.json
    node_id = data.get('id')
    # Ensure 'id' is correctly interpreted (e.g., as an integer or string, as your design expects)
    # ...

    try:
        nd_tool.add_node(node_id, x=data.get('x', 300), y=data.get('y', 300))
        print(node_id)
        print(nd_tool.print_graph_details())
        return jsonify({'id': node_id, 'message': 'Node added successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
@app.route('/api/delete-node', methods=['POST'])
def delete_node_route():
    data = request.json
    node_id = data.get('id')
    
    try:
        # Attempt to delete the node with the provided ID
        if nd_tool.remove_node(node_id):
            return jsonify({'message': f'Node {node_id} deleted successfully'}), 200
        else:
            return jsonify({'error': f'Node {node_id} could not be deleted, it may not exist'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/add-edge', methods=['POST'])
def add_edge_route():
    data = request.json
    source_id = data.get('source')
    target_id = data.get('target')
    weight = data.get('weight', 1)  # Default weight if not provided

    # Convert weight to a float and compare to max_edge_weight
    try:
        weight = float(weight)
    except ValueError:
        return jsonify({'error': 'Invalid weight value'}), 400

    max_edge_weight = nd_tool.constraints.get('max_edge_weight', float('inf'))

    if weight > max_edge_weight:
        return jsonify({'error': f'Edge weight exceeds maximum limit of {max_edge_weight}'}), 400
    
    try:
        # Add the edge to your graph. Adjust this to match how your graph handles edges.
        # Make sure 'nd_tool' is correctly initialized and accessible here.
        nd_tool.add_edge(source_id, target_id, weight=weight)
        
        # Assuming the edge was added successfully, return details of the new edge.
        # Adjust this to include any additional information you want to return.
        newLink = {
            'source': source_id,
            'target': target_id,
            'weight': weight
        }
        
        return jsonify({'newLink': newLink, 'message': 'Edge added successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500




@app.route('/api/get-max-edge-weight', methods=['GET'])
def get_max_edge_weight():
    try:
        max_weight = nd_tool.get_max_edge_weight()
        return jsonify({'maxEdgeWeight': max_weight}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/set-max-edge-weight', methods=['POST'])
def set_max_edge_weight():
    data = request.json
    max_edge_weight = data.get('maxEdgeWeight')
    try:
        max_edge_weight = float(max_edge_weight)
        nd_tool.constraints['max_edge_weight'] = max_edge_weight
        return jsonify({'message': 'Max edge weight updated successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to set max edge weight', 'detail': str(e)}), 500

@app.route('/api/set-max-avg-path-length', methods=['POST'])
def set_max_avg_path_length():
    data = request.json
    max_avg_path_length = data.get('maxAvgPathLength')

    try:
        max_avg_path_length = float(max_avg_path_length)
        nd_tool.constraints['max_avg_path_length'] = max_avg_path_length
        nd_tool.print_constraints()
        return jsonify({'message': 'Max average path length updated successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to set max average path length', 'detail': str(e)}), 500
@app.route('/api/set-max-diameter', methods=['POST'])
def set_max_diameter():
    data = request.json
    max_diameter = data.get('maxDiameter')
    try:
        max_diameter = int(max_diameter)  # Ensure it's an integer value
        nd_tool.constraints['max_diameter'] = max_diameter
        nd_tool.print_constraints()
        return jsonify({'message': 'Max diameter updated successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to set max diameter', 'detail': str(e)}), 500
    

@app.route('/api/set-min-fault-tolerance', methods=['POST'])
def set_min_fault_tolerance():
    data = request.json
    min_fault_tolerance = data.get('minFaultTolerance')

    try:
        min_fault_tolerance = float(min_fault_tolerance)
        nd_tool.constraints['min_fault_tolerance'] = min_fault_tolerance
        nd_tool.print_constraints()
        return jsonify({'message': 'Min fault tolerance updated successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/set-max-degree', methods=['POST'])
def set_max_degree():
    data = request.json
    max_degree = data.get('maxDegree')

    try:
        max_degree = float(max_degree)
        nd_tool.constraints['max_degree'] = max_degree
        nd_tool.print_constraints()
        return jsonify({'message': 'Max degree updated successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-edge', methods=['POST'])
def delete_edge():
    data = request.json
    source_id = data.get('source')
    target_id = data.get('target')

    if source_id is None or target_id is None:
        return jsonify({'error': 'Missing source or target node ID'}), 400

    edge_removed = nd_tool.remove_edge(source_id, target_id)
    if edge_removed:
        return jsonify({'message': 'Edge removed successfully'}), 200
    else:
        return jsonify({'error': 'Edge not found or could not be removed'}), 404
@app.route('/api/change-node-id', methods=['POST'])
def change_node_id():
    data = request.json
    old_node_id = data.get('oldNodeId')
    new_node_id = data.get('newNodeId')
    
    try:
        result = nd_tool.change_node_id(old_node_id, new_node_id)
        if result:
            print(new_node_id)
            return jsonify({'message': f'Node ID changed from {old_node_id} to {new_node_id}'}), 200
        else:
            return jsonify({'error': 'Node ID change failed'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@app.route('/api/change-edge-weight', methods=['POST'])
def change_edge_weight():
    data = request.json
    source_id = data.get('source')
    target_id = data.get('target')
    new_weight = data.get('newWeight')

    try:
        if nd_tool.change_edge_weight(source_id, target_id, new_weight):
            return jsonify({'message': 'Edge weight updated successfully'}), 200
        else:
            return jsonify({'error': 'Edge not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/calculate-shortest-path', methods=['POST'])
def calculate_shortest_path_route():
    data = request.json
    source_node_id = data.get('source')
    target_node_id = data.get('target')
    print(nd_tool.print_graph_details())
    try:
        path, total_weight = nd_tool.calculate_shortest_path(source_node_id, target_node_id)
        return jsonify({'path': path, 'total_weight': total_weight}), 200
    except nx.NetworkXNoPath:
        return jsonify({'error': 'No path exists between the source and target nodes'}), 404
@app.route('/api/floyd-warshall', methods=['GET'])  # Change to GET if no body content is needed
def floyd_warshall():
    # No need to parse a request body as the graph data will be directly accessed from nd_tool

    # Calculate shortest paths using Floyd-Warshall
    shortest_paths = nd_tool.floyd_warshall_shortest_paths()

    # Convert the paths to a serializable format, handling infinity
    shortest_paths_serializable = {
        str(k): {
            str(inner_k): "∞" if np.isinf(inner_v) else int(inner_v)
            for inner_k, inner_v in v.items()
        } for k, v in shortest_paths.items()
    }

    # Return the shortest paths
    return jsonify(shortest_paths=shortest_paths_serializable)

@app.route('/api/dijkstra-shortest-path', methods=['POST'])
def dijkstra_shortest_path_route():
    data = request.json
    source_node_id = data.get('source')
    try:
        paths, lengths = nd_tool.dijkstra_shortest_paths(source_node_id)
        return jsonify({'paths': paths, 'lengths': lengths}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/get-adjacency-matrix', methods=['GET'])
def get_adjacency_matrix():
    matrix, sorted_nodes = nd_tool.get_adjacency_matrix()
    print(matrix)
    print(sorted_nodes)
    return jsonify({
        'matrix': matrix,
        'sortedNodes': sorted_nodes
    })
@app.route('/api/export', methods=['POST'])
def export_graph():
    data = request.get_json()
    node_positions = data.get('positions', {})

    # Create a temporary file and close its file descriptor immediately
    fd, temp_filename = tempfile.mkstemp(suffix='.graphml')
    os.close(fd)

    try:
        # Update the graph with the received node positions
        nd_tool.update_node_positions(node_positions)
        
        # Export the graph to the temporary file
        nd_tool.export_graph_with_positions(temp_filename, 'graphml')

        # Read the file content
        with open(temp_filename, 'rb') as f:
            graphml_content = f.read()
        
        # Prepare the response
        response = Response(graphml_content, mimetype='application/graphml+xml')
        response.headers.set('Content-Disposition', 'attachment', filename='network.graphml')
        
        return response
    except Exception as e:
        print(f"Failed to export the graph: {e}")
        return jsonify({"error": "Error exporting the graph"}), 500
    finally:
        # Ensure the file is removed after sending it
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

@app.route('/api/import', methods=['POST'])
def import_graph_route():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    temp_dir = Path(app.instance_path) / 'temp'
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_file = temp_dir / secure_filename(file.filename)
    try:
        file.save(temp_file)
         # Assuming the tool is initialized here
        nd_tool.import_graph_with_positions(str(temp_file))

        nodes, links = nd_tool.get_nodes_and_links()  # Assuming this function exists
        print(nd_tool.is_directed())
        graph_type = 'directed' if nd_tool.graph.is_directed() else 'undirected'
        
        print(nodes)
        return jsonify({'nodes': nodes, 'links': links, 'graphType': graph_type})

    except Exception as e:
        return jsonify({'error': 'Failed to process file', 'message': str(e)}), 500
    finally:
        os.remove(temp_file)
    
@app.route('/api/calculate-bfs-path', methods=['POST'])
def calculate_bfs_path_route():
    data = request.json
    source_node_id = data.get('source')
    target_node_id = data.get('target')
    try:
        path, edges = nd_tool.calculate_bfs_path(source_node_id, target_node_id)
        return jsonify({'path': path, 'edges': edges, 'message': 'BFS path calculated successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'An error occurred while calculating the BFS path', 'detail': str(e)}), 500


import logging

@app.route('/api/calculate-dfs-path', methods=['POST'])
def calculate_dfs_path_route():
    data = request.json
    source_node_id = data.get('source')
    target_node_id = data.get('target')

    if not source_node_id or not target_node_id:
        return jsonify({'error': 'Source and target node IDs must be provided'}), 400

    try:
        visit_order, edges = nd_tool.calculate_dfs_path(source_node_id, target_node_id)
        return jsonify({
            'visit_order': visit_order,
            'edges': edges,
            'message': 'DFS exploration completed successfully'
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'An error occurred while calculating the DFS path', 'detail': str(e)}), 500

@app.route('/api/calculate-mst-msa', methods=['GET'])
def calculate_mst_msa():
    try:
        tree_edges, total_weight = nd_tool.calculate_minimum_spanning_tree()
        return jsonify({'tree_edges': tree_edges, 'total_weight': total_weight}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500



    
@app.route('/api/detect-communities', methods=['GET'])
def detect_communities():
    try:
        communities = nd_tool.detect_communities_louvain()
        return jsonify({'communities': communities}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# Flask route to find strongly connected components
@app.route('/api/find-strong-components', methods=['GET'])
def find_strong_components():
    if not nd_tool.graph.is_directed():
        return jsonify({'error': 'This operation requires a directed graph'}), 400
    try:
        components = nd_tool.find_strongly_connected_components()
        # Format components as lists of nodes to be easier to use on the client-side
        components_list = [list(component) for component in components]
        return jsonify({'strongly_connected_components': components_list}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@app.route('/api/calculate-routing-table', methods=['GET'])
def get_routing_table():
    source_node_id = request.args.get('source')
    print(f"Source node ID received: {source_node_id}")
    print("Graph nodes and links:", nd_tool.get_nodes_and_links())

    if not source_node_id:
        return jsonify({'error': 'Source node ID is required'}), 400

    # Ensure the source node ID is treated as a string
    source_node_id = int(source_node_id)

    # Debug print: List all nodes in the graph
    print(f"Nodes in the graph: {list(nd_tool.graph.nodes)}")

    # Check if the node exists
    if not nd_tool.graph.has_node(source_node_id):
        return jsonify({'error': f"Source node {source_node_id} does not exist in the graph"}), 404

    try:
        routing_table = nd_tool.calculate_routing_table(source_node_id)
        return jsonify({'routing_table': routing_table}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400  # Handles type conversion errors and custom value errors
    except Exception as e:
        return jsonify({'error': str(e)}), 500  # Generic exception catch
    

# @app.route('/add-graph', methods=['POST'])
# def add_graph():
#     graph_data = request.get_json()
#     nodes = graph_data.get('nodes', [])
#     links = graph_data.get('links', [])
#     is_directed = graph_data.get('isDirected', False)

#     # Here you would handle the logic to save or process this graph data.
#     # For example, save to a database or perform calculations.

#     return jsonify({'message': 'Graph data added successfully', 'nodes': nodes, 'links': links, 'isDirected': is_directed})


@app.route('/api/create_star_graph', methods=['POST'])
def create_star_graph():
    try:
        data = request.get_json()
        num_nodes = int(data['num_nodes'])
        if num_nodes <= 0:
            raise ValueError("Number of nodes must be greater than zero.")

        nd_tool.create_star_topology(num_nodes)
        nodes, links = nd_tool.get_nodes_and_links()
        
        matrix, sorted_nodes = nd_tool.get_adjacency_matrix()
        print("Sending data:", {'nodes': nodes, 'links': links, 'matrix': matrix, 'sorted_nodes': sorted_nodes})
        return jsonify({'nodes': nodes, 'links': links, 'matrix': matrix, 'sorted_nodes': sorted_nodes})
    except Exception as e:
        print(f"Error during graph operations: {str(e)}")
        return jsonify({'error': str(e)}), 400
    

@app.route('/api/create_ring_graph', methods=['POST'])
def create_ring_graph():
    try:
        data = request.get_json()
        num_nodes = int(data['num_nodes'])
        if num_nodes <= 0:
            raise ValueError("Number of nodes must be greater than zero.")

        nd_tool.create_ring_topology(num_nodes)
        nodes, links = nd_tool.get_nodes_and_links()
        
        matrix, sorted_nodes = nd_tool.get_adjacency_matrix()
        print("Sending data:", {'nodes': nodes, 'links': links, 'matrix': matrix, 'sorted_nodes': sorted_nodes})
        return jsonify({'nodes': nodes, 'links': links, 'matrix': matrix, 'sorted_nodes': sorted_nodes})
    except Exception as e:
        print(f"Error during graph operations: {str(e)}")
        return jsonify({'error': str(e)}), 400
    

@app.route('/api/create_bus_graph', methods=['POST'])
def create_bus_graph():
    try:
        data = request.get_json()
        num_nodes = int(data['num_nodes'])
        if num_nodes <= 0:
            raise ValueError("Number of nodes must be greater than zero.")

        nd_tool.create_bus_topology(num_nodes)
        nodes, links = nd_tool.get_nodes_and_links()
        
        matrix, sorted_nodes = nd_tool.get_adjacency_matrix()
        print("Sending data:", {'nodes': nodes, 'links': links, 'matrix': matrix, 'sorted_nodes': sorted_nodes})
        return jsonify({'nodes': nodes, 'links': links, 'matrix': matrix, 'sorted_nodes': sorted_nodes})
    except Exception as e:
        print(f"Error during graph operations: {str(e)}")
        return jsonify({'error': str(e)}), 400
    

@app.route('/api/create_mesh_graph', methods=['POST'])
def create_mesh_graph():
    try:
        data = request.get_json()
        num_nodes = int(data['num_nodes'])
        if num_nodes <= 0:
            raise ValueError("Number of nodes must be greater than zero.")

        nd_tool.create_mesh_topology(num_nodes)
        nodes, links = nd_tool.get_nodes_and_links()
        
        matrix, sorted_nodes = nd_tool.get_adjacency_matrix()
        print("Sending data:", {'nodes': nodes, 'links': links, 'matrix': matrix, 'sorted_nodes': sorted_nodes})
        return jsonify({'nodes': nodes, 'links': links, 'matrix': matrix, 'sorted_nodes': sorted_nodes})
    except Exception as e:
        print(f"Error during graph operations: {str(e)}")
        return jsonify({'error': str(e)}), 400

    


@app.route('/api/add-graph', methods=['POST'])
def add_graph():
    graph_data = request.get_json()
    nodes = graph_data.get('nodes', [])
    links = graph_data.get('links', [])
    is_directed = graph_data.get('isDirected', False)

    # Clear the current graph and set the correct type
    nd_tool.reset_graph()
    if is_directed:
        nd_tool.set_graph_type('directed')
    else:
        nd_tool.set_graph_type('undirected')
    
    # Add nodes and edges to the graph
    for node in nodes:
        # Here assuming 'id' is part of the node data
        nd_tool.add_node(node['id'], **node)
    
    for link in links:
        # Assuming 'source' and 'target' are part of the link data
        # Optional: handle weights if provided
        weight = link.get('weight', 1)  # Use default weight if not specified
        nd_tool.add_edge(link['source'], link['target'], weight=weight)

    # Optionally check if the graph is valid after additions
    if not nd_tool.check_constraints():
        return jsonify({'error': 'Graph does not meet constraints'}), 400

    return jsonify({'message': 'Graph data added successfully'}), 200


@app.route('/api/calculate-fault-tolerance', methods=['GET'])
def handle_fault_tolerance():
    fault_tolerance, critical_edges = nd_tool.calculate_fault_tolerance_and_critical_edges()

    if fault_tolerance is None:
        # Handle the case where fault tolerance wasn't calculated correctly
        return jsonify({'error': 'Failed to calculate fault tolerance, possibly due to graph configuration: ' + str(critical_edges)}), 500

    # min_fault_tolerance = nd_tool.constraints['min_fault_tolerance']
    response_data = {
        'fault_tolerance': fault_tolerance,
        'critical_edges': critical_edges  # assuming this is always well-formed
    }

    # if fault_tolerance < min_fault_tolerance:
    #     response_data.update({
    #         'status': 'below_minimum',
    #         'message': 'Graph\'s fault tolerance is below the minimum required.'
    #     })
    # else:
    #     response_data.update({
    #         'status': 'above_minimum',
    #         'message': 'Graph\'s fault tolerance meets or exceeds the minimum required.'
    #     })

    return jsonify(response_data), 200

@app.route('/api/get-improvements', methods=['POST'])
def get_improvements():
    data = request.get_json()
    positions = data.get('positions')
    max_edges = data.get('maxEdges', 5)
    alpha = data.get('alpha', 0.5)

    if not positions:
        return jsonify({'error': 'Positions data is required.'}), 400
    if not isinstance(max_edges, int) or not isinstance(alpha, float):
        return jsonify({'error': 'Invalid data types for max_edges or alpha.'}), 400

    try:
        improvements = nd_tool.suggest_improvements(positions, max_edges, alpha)
        return jsonify({'improvements': improvements, 'message': 'Improvement suggestions calculated successfully.'}), 200
    except Exception as e:
        app.logger.error(f"An error occurred while calculating improvements: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# from flask import Flask, jsonify

@app.route('/api/calculate-diameter-path', methods=['GET'])
def calculate_diameter_and_path():
    try:
        diameter_value, path_edges = nd_tool.calculate_weighted_diameter_and_path()
        return jsonify({'diameter': diameter_value, 'path': path_edges}), 200
    except Exception as e:
        app.logger.error(f"Failed to calculate diameter and path: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

    

@app.route('/api/calculate-average-path-length', methods=['GET'])
def calculate_average_path_length_route():
    try:
        average_path_length = nd_tool.calculate_average_path_length()
        return jsonify({'averagePathLength': average_path_length}), 200
    except nx.NetworkXError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500













if __name__ == "__main__":
    app.run(debug=True)
