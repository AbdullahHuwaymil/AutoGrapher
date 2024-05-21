import community  # This is python-louvain
import copy
import itertools
import pickle
import heapq

import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
import pandas as pd
import scipy as sp
from collections import deque
import networkx.algorithms.tree.mst as mst
from community import community_louvain

class NetworkDesignTool:
    def __init__(self):
        self.id_to_index = {}  # Maps node IDs to indices
        self.index_to_id = []  # List to map indices back to node IDs
        self.weight_type = 'cost'
        self.type = 'undirected'  # This could be 'directed' based on your needs
        self.graph = self._create_graph(self.type)

        self.history = []
        self.future = []
        self.constraints = {
            'max_edge_weight': 99999999, 'max_diameter': 99999999,
            'max_avg_path_length': 99999999, "min_fault_tolerance": 0, 'max_degree': 99999999,
            'max_edge_density': 9999999, "min_edge_density": 0
        }
    def _create_graph(self, type):
        """Helper function to create a graph based on the specified type."""
        if type == 'directed':
            return nx.DiGraph()
        else:
            return nx.Graph()  # Default to undirected graph
    def reset_graph(self):
        """Resets the graph to an empty graph of the current type (directed or undirected)."""
        self.graph = self._create_graph(self.type)
        # Optionally, record this reset operation if you're tracking history for undo/redo functionality.
        self._record_state()

    def set_graph_type(self, type):
        """Set the graph type to directed or undirected."""
        current_edges = self.graph.edges(data=True)
        self.type = type
        self.graph = self._create_graph(type)
        self.graph.add_edges_from(current_edges)
        self._record_state()

    def _record_state(self):
        """Helper method to record the current state of the graph for undo/redo functionality."""
        self.history.append(copy.deepcopy(self.graph))
        self.future.clear()
    def add_node(self, node_id, **attributes):
        # Directly add the node using its ID, not an index
        self.graph.add_node(node_id, **attributes)
        # Record the state after adding the node
        self.history.append(copy.deepcopy(self.graph))
        self.future.clear()

    
    def get_node_index(self, node_id):
        # Get the matrix index for a given node ID
        return self.id_to_index.get(node_id)

    def get_node_id(self, index):
        # Get the node ID for a given matrix index
        if index < len(self.index_to_id):
            return self.index_to_id[index]
        return None
    def print_graph_details(nd_tool):
        # Access the graph object within the NetworkDesignTool instance
        graph = nd_tool.graph

        # Print all nodes and their attributes
        print("Nodes and their attributes:")
        for node, attrs in graph.nodes(data=True):
            print(f"Node ID: {node}, Attributes: {attrs}")

        # Print all edges and their attributes (including weights if available)
        print("\nEdges and their attributes:")
        for source, target, attrs in graph.edges(data=True):
            print(f"Edge from {source} to {target}, Attributes: {attrs}")


    def print_graph_details(self):
        print("Edges and their attributes:")
        for source, target, attrs in self.graph.edges(data=True):
            print(f"Edge from {source} to {target}, Attributes: {attrs}")

    def remove_node(self, node_id):
        # Check if the node exists in the graph
        if self.graph.has_node(node_id):
            self.graph.remove_node(node_id)
            self.history.append(copy.deepcopy(self.graph))
            self.future.clear()
            return True
        else:
            return False    
    def change_node_id(self, old_node_id, new_node_id):
        # Check if the old node ID exists and the new node ID does not exist in the graph
        if old_node_id not in self.graph or new_node_id in self.graph:
            return False  # Operation cannot proceed if conditions are not met

        # Get attributes of the old node
        node_attrs = self.graph.nodes[old_node_id]

        # Add a new node with the old node's attributes
        self.graph.add_node(new_node_id, **node_attrs)

        # Reconnect edges. The process differs for directed and undirected graphs.
        if isinstance(self.graph, nx.DiGraph):
            # For directed graphs, handle both incoming and outgoing edges
            for successor in self.graph.successors(old_node_id):
                edge_attrs = self.graph[old_node_id][successor]
                self.graph.add_edge(new_node_id, successor, **edge_attrs)

            for predecessor in self.graph.predecessors(old_node_id):
                edge_attrs = self.graph[predecessor][old_node_id]
                self.graph.add_edge(predecessor, new_node_id, **edge_attrs)
        else:
            # For undirected graphs, just handle the neighbors
            for neighbor in self.graph.neighbors(old_node_id):
                edge_attrs = self.graph[old_node_id][neighbor]
                self.graph.add_edge(new_node_id, neighbor, **edge_attrs)

        # Remove the old node
        self.graph.remove_node(old_node_id)

        # Record this change for undo/redo functionality
        self._record_state()

        return True  # Indicate successful ID change

        
   

    def change_edge_weight(self, source, target, new_weight):
        """
        Change the weight of an edge. For undirected graphs, it also updates the reverse edge.
        """
        if self.graph.has_edge(source, target):
            # Update the weight for the existing edge
            self.graph[source][target]['weight'] = new_weight

            # If the graph is undirected, also update the reverse edge
            if not self.graph.is_directed() and self.graph.has_edge(target, source):
                self.graph[target][source]['weight'] = new_weight

            return True
        else:
            return False  # Edge does not exist

    def enter_constraints(self, max_edge_weight, max_diameter, max_avg_path_length, min_fault_tolerance,
                          max_degree, ):

        self.constraints['max_edge_weight'] = max_edge_weight
        self.constraints['max_diameter'] = max_diameter
        self.constraints['max_avg_path_length'] = max_avg_path_length
        self.constraints['min_fault_tolerance'] = min_fault_tolerance
        self.constraints['max_degree'] = max_degree
        self.constraints['max_diameter'] = max_diameter

    
  
    def calculate_bfs_path(self, source, target):
        if not self.graph.has_node(source) or not self.graph.has_node(target):
            raise ValueError("Source or target node does not exist in the graph")

        queue = deque([(source, None)])  # Include parent in the queue
        visited = set()
        exploration_order = []
        edges = []

        try:
            while queue:
                current_node, parent = queue.popleft()
                if current_node not in visited:
                    visited.add(current_node)
                    exploration_order.append(current_node)
                    if parent is not None:
                        edges.append({'source': parent, 'target': current_node})

                    if current_node == target:
                        return exploration_order, edges

                    for neighbor in self.graph.neighbors(current_node):
                        if neighbor not in visited:
                            queue.append((neighbor, current_node))

            raise ValueError("The target node is not reachable from the source node")
        except Exception as e:
            raise ValueError(f"An error occurred during BFS exploration: {str(e)}")


    def calculate_dfs_path(self, source, target):
        if not self.graph.has_node(source) or not self.graph.has_node(target):
            raise ValueError("Source or target node does not exist in the graph.")

        stack = [(source, None)]  # Initialize stack with source and a placeholder for parent
        visited = set()
        path = []  # To store the path of nodes visited
        edge_list = []  # To store the traversal edges

        while stack:
            current, parent = stack.pop()
            if current not in visited:
                visited.add(current)
                path.append(current)
                if parent is not None:  # Ensure we don't append None type to the edge list
                    edge_list.append({'source': parent, 'target': current})

                if current == target:  # Stop if the target is reached
                    break

                # Push all unvisited adjacent nodes to the stack
                for neighbor in reversed(list(self.graph.neighbors(current))):
                    if neighbor not in visited:
                        stack.append((neighbor, current))

        return path, edge_list







        







    def check_constraints(self):

        # Check if the graph satisfies all provided constraints
        if (self.constraints['max_edge_density'] < nx.density(self.graph)
                or nx.density(self.graph) < self.constraints['min_edge_density']
                or self.constraints['min_fault_tolerance'] > self.measure_fault_tolerance()
                or self.constraints['max_avg_path_length'] < self.average_shortest_path_length()
                or self.constraints['min_fault_tolerance'] > self.measure_fault_tolerance()
                or self.constraints['max_diameter'] < nx.diameter(self.graph)):
            return False
        else:
            return True


    def add_edge(self, source, target, **attributes):
        # This checks if both the source and target nodes exist in the graph,
        # if not, adds them.
        if not self.graph.has_node(source):
            self.add_node(source)
        if not self.graph.has_node(target):
            self.add_node(target)

        # Adds the edge between source and target nodes with the given attributes.
        self.graph.add_edge(source, target, **attributes)

        # For directed graphs, check if attributes specify a reverse edge should be added
        if self.type == 'directed' and ('reverse_weight' in attributes):
            # Add the reverse edge with specified reverse weight or default to the same weight if not specified
            reverse_weight = attributes.get('reverse_weight', attributes.get('weight'))
            self.graph.add_edge(target, source, weight=reverse_weight)

        # Optionally, you can record the state of the graph for undo/redo functionality.
        self.history.append(copy.deepcopy(self.graph))
        self.future.clear()



    def remove_edge(self, source, target):
        if self.graph.has_edge(source, target):
            self.graph.remove_edge(source, target)
            return True
        else:
            return False

    def edit_node_attributes(self, node, **attributes):
        for attr, value in attributes.items():
            self.graph.nodes[node][attr] = value
        self.history.append(copy.deepcopy(self.graph))
        self.future.clear()

    def import_graph_from_csv(self, path):
        edge_list = pd.read_csv(path)
        self.graph = nx.from_pandas_edgelist(edge_list)
        self.history.append(copy.deepcopy(self.graph))
        self.future.clear()

    def from_adjacency_matrix(self, matrix):

        # Create a graph from the adjacency matrix
        self.graph = nx.from_numpy_array(np.array(matrix))
    # def get_adjacency_matrix(self):
    #     # Use NetworkX's adjacency_matrix function to get the adjacency matrix in sparse format
    #     sparse_matrix = nx.adjacency_matrix(self.graph)

    import networkx as nx

    def get_adjacency_matrix(self):
        num_nodes = self.graph.number_of_nodes()
        num_edges = self.graph.number_of_edges()

        print(f"Attempting to get adjacency matrix for graph with {num_nodes} nodes and {num_edges} edges")

        if num_nodes == 0:
            print("Graph is considered empty.")
            return [], []  # Return empty matrix and node list if the graph has no nodes

        # Generate a full matrix of zeros if there are nodes but no edges
        if num_edges == 0:
            zero_matrix = [[0] * num_nodes for _ in range(num_nodes)]
            sorted_nodes = sorted(self.graph.nodes(), key=int)  # Convert nodes to integers for sorting
            return zero_matrix, sorted_nodes

        # Use NetworkX to generate the adjacency matrix when edges are present
        sparse_matrix = nx.adjacency_matrix(self.graph)
        dense_matrix = sparse_matrix.todense().tolist()
        sorted_nodes = sorted(self.graph.nodes(), key=int)  # Convert nodes to integers for sorting
        print(sorted_nodes)
        return dense_matrix, sorted_nodes





    def import_graph(self, path, file_format='graphml'):
        # Reads the graph from a file
        imported_graph = nx.read_graphml(path)

        # Ensure the imported graph matches the type of the existing graph
        if self.type == 'directed' and not imported_graph.is_directed():
            imported_graph = nx.DiGraph(imported_graph)  # Convert to directed
        elif self.type == 'undirected' and imported_graph.is_directed():
            imported_graph = nx.Graph(imported_graph)    # Convert to undirected

        # Check if conversion (if any) has resolved the type mismatch
        if (self.type == 'directed' and not imported_graph.is_directed()) or \
        (self.type == 'undirected' and imported_graph.is_directed()):
            raise TypeError("Failed to convert graph type properly.")

        # Combine the existing graph with the imported graph
        self.graph = nx.compose(self.graph, imported_graph)
        
    def import_graph_with_positions(self, path):
        """Import a graph and update node positions directly from the file."""
        imported_graph = nx.read_graphml(path)

        # Determine if the imported graph is directed and convert types if necessary
        imported_graph_type = 'directed' if imported_graph.is_directed() else 'undirected'
        self.type = imported_graph_type

        # Initialize an appropriate graph type based on imported_graph_type
        if self.type == 'directed':
            graph = nx.DiGraph()
        else:
            graph = nx.Graph()

        # Convert all nodes and edges to the new graph with integer node IDs
        for node, data in imported_graph.nodes(data=True):
            # Convert node ID from string to integer
            numeric_id = int(node)
            # Add node with numeric ID and associated data
            graph.add_node(numeric_id, **data)

        for u, v, attrs in imported_graph.edges(data=True):
            # Convert endpoint IDs from string to integer and add edges
            graph.add_edge(int(u), int(v), **attrs)

        # Replace the existing graph with the new graph
        self.graph = graph
        print(self.print_graph_details())
        return self.type  # Return the type of the graph for further processing



    def get_nodes_and_links(self):
        nodes = [{"id": str(n), **self.graph.nodes[n]} for n in self.graph.nodes()]
        links = [{"source": str(u), "target": str(v), "weight": attr.get('weight', 1)} for u, v, attr in self.graph.edges(data=True)]  # Default weight is 1
        return nodes, links


    def from_excel_adjacency_matrix(self, file_path):
        # Read the adjacency matrix from the Excel file
        df = pd.read_excel(file_path, header=None)

        # Convert the DataFrame to a numpy array
        matrix = df.values

        # Create a graph from the adjacency matrix
        self.graph = nx.from_numpy_array(matrix)

    def draw_graph(self, edge_labels=False):
        pos = nx.spring_layout(self.graph)
        nx.draw(self.graph, pos, with_labels=True)
        if edge_labels:
            labels = nx.get_edge_attributes(self.graph, 'weight')
            nx.draw_networkx_edge_labels(self.graph, pos, edge_labels=labels)
        plt.show()

    def calculate_minimum_spanning_tree(self):
        mst = nx.minimum_spanning_tree(self.graph)
        return mst.edges(data=True)

    def calculate_shortest_path(self, source, target):
        # Calculate the shortest path
        path = nx.shortest_path(self.graph, source=source, target=target, weight='weight')
        # Calculate the total weight of the shortest path
        total_weight = nx.shortest_path_length(self.graph, source=source, target=target, weight='weight')
        return path, total_weight

    def undo(self):
        if len(self.history) > 1:
            self.future.append(self.history.pop())
            self.graph = self.history[-1]

    def redo(self):
        if self.future:
            self.history.append(self.future.pop())
            self.graph = self.history[-1]

    def is_graph_connected(self):
        return nx.is_connected(self.graph)

    def get_connected_components(self):
        return nx.connected_components(self.graph)

    def save_graph(self, path):
        with open(path, 'wb') as f:
            pickle.dump(self.graph, f)

    def load_graph(self, path):
        with open(path, 'rb') as f:
            self.graph = pickle.load(f)
        self.history.append(copy.deepcopy(self.graph))
        self.future.clear()
    def is_directed(self):
        """
        Determine whether the graph is directed or undirected.
        Returns:
            str: 'Directed' if the graph is directed, 'Undirected' otherwise.
        """
        return 'Directed' if self.graph.is_directed() else 'Undirected'
    def print_graph_state(self):
        print("Current graph nodes and their data:")
        for node, data in self.graph.nodes(data=True):
            print(f"Node {node} (type {type(node)}): {data}")

    def update_node_positions(self, positions):
        """Update graph with node positions, ensuring consistent node ID types."""
        print("Starting to update node positions...")
        missing_nodes = []
        
        # Iterate through all provided positions
        for node_id_str, pos in positions.items():
            try:
                # Convert node ID to integer if possible
                node_id = int(node_id_str)
            except ValueError:
                # If conversion fails, log the problematic node
                print(f"Invalid node ID: {node_id_str}. It couldn't be converted to an integer.")
                continue

            # Check if the node exists in the graph
            if not self.graph.has_node(node_id):
                missing_nodes.append(node_id_str)
                print(f"Node {node_id_str} (converted to type {type(node_id)}) does not exist in the graph.")
            else:
                # Update the node's position if it exists
                self.graph.nodes[node_id]['x'] = float(pos['x'])
                self.graph.nodes[node_id]['y'] = float(pos['y'])
                print(f"After update - Node {node_id}: {self.graph.nodes[node_id]}")

        # Report any nodes that were missing
        if missing_nodes:
            print("Missing nodes: ", missing_nodes)
        else:
            print("All specified nodes updated successfully.")









    def export_graph_with_positions(self, path, file_format='graphml'):
        """Export the graph to a GraphML file including node positions."""
        print("Final node positions before export:")
        for node_id in self.graph.nodes(data=True):
            print(node_id)

        if file_format == 'graphml':
            nx.write_graphml(self.graph, path)


    def export_graph(self, path, file_format='graphml'):
        # Use positions in export if needed
        if file_format == 'graphml':
            nx.write_graphml(self.graph, path)


    def print_basic_metrics(self):
        print("Number of nodes:", self.graph.number_of_nodes())
        print("Number of edges:", self.graph.number_of_edges())
        if self.is_graph_connected():
            print("Average shortest path length:", nx.average_shortest_path_length(self.graph))
            print("Diameter:", nx.diameter(self.graph))
        else:
            print("The graph is not connected.")
            print("Connected Components:", self.get_connected_components())

    def add_nodes_from(self, nodes, **attributes):
        self.graph.add_nodes_from(nodes, **attributes)
        self.history.append(copy.deepcopy(self.graph))
        self.future.clear()

    def add_edges_from(self, edges, **attributes):
        self.graph.add_edges_from(edges, **attributes)
        self.history.append(copy.deepcopy(self.graph))
        self.future.clear()


    def get_max_edge_weight(self):
        return self.constraints.get('max_edge_weight', float('inf'))  # Return a large number if not set


    def calculate_degree(self, node):
        return self.graph.degree(node)

    def calculate_degree_centrality(self, node):
        return nx.degree_centrality(self.graph)[node]

    def calculate_closeness_centrality(self, node):
        return nx.closeness_centrality(self.graph)[node]

    def calculate_betweenness_centrality(self, node):
        return nx.betweenness_centrality(self.graph)[node]

    def shortest_path(self, source, target):
        return nx.shortest_path(self.graph, source, target)

    def average_shortest_path_length(self):
        return nx.average_shortest_path_length(self.graph)

    def clustering_coefficient(self, node):
        return nx.clustering(self.graph, node)

    def calculate_pagerank(self):
        return nx.pagerank(self.graph)

    def detect_communities(self):
        partition = community.best_partition(self.graph)
        return partition

    def most_valuable_edge(self):
        betweenness = nx.edge_betweenness_centrality(self.graph)
        return max(betweenness, key=betweenness.get)

    def assortativity_coefficient(self):
        return nx.degree_assortativity_coefficient(self.graph)

    def graph_diffusion(self, initial_state, rate):
        adjacency = nx.adjacency_matrix(self.graph)
        diffusion_matrix = np.eye(self.graph.number_of_nodes()) + rate * adjacency
        return np.dot(diffusion_matrix, initial_state)

    def _create_graph(self, type):
        """Create an empty graph based on the specified type."""
        if type == 'directed':
            return nx.DiGraph()
        else:
            return nx.Graph()

    def create_ring_topology(self, num_nodes):
        """Create a ring topology with a specific number of nodes."""
        temp_graph = nx.cycle_graph(num_nodes, create_using=nx.DiGraph() if self.type == 'directed' else nx.Graph())
        self.graph = nx.relabel_nodes(temp_graph, {i: i + 1 for i in range(num_nodes)})

    def create_bus_topology(self, num_nodes):
        """Create a bus (path) topology with a specific number of nodes."""
        temp_graph = nx.path_graph(num_nodes, create_using=nx.DiGraph() if self.type == 'directed' else nx.Graph())
        self.graph = nx.relabel_nodes(temp_graph, {i: i + 1 for i in range(num_nodes)})

    def create_star_topology(self, num_nodes):
        """Create a star topology for both directed and undirected graphs."""
        try:
            # Clear the existing graph and prepare for a new topology
            self.graph.clear()

            # Adding nodes
            self.graph.add_nodes_from(range(1, num_nodes + 1))

            # Adding edges
            if self.type == 'directed':
                # In a directed star, the central node (1) points to all other peripheral nodes
                for node in range(2, num_nodes + 1):
                    self.graph.add_edge(1, node)  # Center node is the source, other nodes are targets
            else:
                # In an undirected star, all peripheral nodes connect to the center node
                for node in range(2, num_nodes + 1):
                    self.graph.add_edge(1, node)

        except Exception as e:
            print(f"Error during star graph creation: {str(e)}")
            raise ValueError("Directed Graph not supported") from e


    def create_mesh_topology(self, num_nodes):
        """Create a fully connected (mesh) topology with a specific number of nodes."""
        temp_graph = nx.complete_graph(num_nodes, create_using=nx.DiGraph() if self.type == 'directed' else nx.Graph())
        self.graph = nx.relabel_nodes(temp_graph, {i: i + 1 for i in range(num_nodes)})

    # def suggest_improvements(self, positions, max_edges, alpha=0.5):
    #     # Calculate the distances between all pairs of nodes
    #     distances = {(u, v): np.linalg.norm(np.array(positions[u]) - np.array(positions[v])) for u, v in
    #                  itertools.combinations(self.graph.nodes, 2)}

    #     # Find pairs of nodes that are not directly connected
    #     not_connected = {pair: dist for pair, dist in distances.items() if not self.graph.has_edge(*pair)}

    #     # Calculate the shortest path lengths
    #     shortest_paths = dict(nx.shortest_path_length(self.graph, weight='weight'))

    #     # Calculate the distance saved by adding each possible new edge
    #     savings = {pair: shortest_paths[pair[0]][pair[1]] - dist for pair, dist in not_connected.items() if
    #                shortest_paths[pair[0]][pair[1]] > dist}

    #     # Rank by the ratio of the distance saved to the cost of the new edge, adjusted by alpha
    #     improvements = [(savings[pair] / distances[pair] ** alpha, pair) for pair in savings]

    #     # Use a heap to get the top k improvements
    #     top_improvements = heapq.nlargest(max_edges, improvements)

    #     return top_improvements


    def suggest_improvements(self, positions, max_edges, alpha):
        try:
            nodes = [str(n) for n in self.graph.nodes()]
            missing_nodes = [node for node in nodes if node not in positions]
            if missing_nodes:
                raise ValueError(f"Missing position data for nodes: {missing_nodes}")

            distances = {
                (u, v): np.linalg.norm(np.array([positions[u]['x'], positions[u]['y']]) - np.array([positions[v]['x'], positions[v]['y']]))
                for u, v in itertools.combinations(nodes, 2)
            }
            print("Distances between unconnected nodes:", distances)

            not_connected = {pair: dist for pair, dist in distances.items() if not self.graph.has_edge(*pair)}
            print("Unconnected node pairs and their distances:", not_connected)

            shortest_paths = dict(nx.shortest_path_length(self.graph, weight='weight'))
            savings = {}
            for pair, dist in not_connected.items():
                path_length = shortest_paths.get(pair[0], {}).get(pair[1], None)
                if path_length and path_length > dist:
                    savings[pair] = path_length - dist
            print("Savings from potential new edges:", savings)

            improvements = [(savings[pair] / (distances[pair] ** alpha), pair) for pair in savings if savings[pair] > 0]
            print("Improvements:", improvements)

            top_improvements = heapq.nlargest(max_edges, improvements, key=lambda x: x[0])

            return top_improvements
        except Exception as e:
            print(f"Error while calculating improvements: {e}")
            raise ValueError(f"An error occurred: {str(e)}")








    


    def measure_robustness(self):
        # Get the number of nodes and edges in the original graph
        num_nodes = self.graph.number_of_nodes()
        num_edges = self.graph.number_of_edges()

        # Create a copy of the graph
        graph_copy = self.graph.copy()

        # Remove nodes and edges one by one until the graph is disconnected
        while nx.is_connected(graph_copy):
            nodes = list(graph_copy.nodes)
            edges = list(graph_copy.edges)
            if nodes:
                graph_copy.remove_node(nodes[0])
            elif edges:
                graph_copy.remove_edge(*edges[0])

        # Calculate the robustness metric
        robustness = (graph_copy.number_of_nodes() / num_nodes) + (graph_copy.number_of_edges() / num_edges) / 2
        return robustness

    def measure_fault_tolerance(self):
        # Get the number of nodes and edges in the original graph
        num_nodes = self.graph.number_of_nodes()
        num_edges = self.graph.number_of_edges()

        # Create a copy of the graph
        graph_copy = self.graph.copy()

        # Remove nodes and edges one by one until the graph is non-functional
        while nx.is_connected(graph_copy) and graph_copy.number_of_nodes() > 1:
            nodes = list(graph_copy.nodes)
            edges = list(graph_copy.edges)
            if nodes:
                graph_copy.remove_node(nodes[0])
            elif edges:
                graph_copy.remove_edge(*edges[0])

        # Calculate the fault tolerance metric
        fault_tolerance = ((graph_copy.number_of_nodes() / num_nodes)
                           + (graph_copy.number_of_edges() / num_edges) / 2)
        return fault_tolerance

    def random_failure_resilience(self):
        # Clone the graph
        graph = self.graph.copy()

        # Get the nodes in random order
        nodes = list(graph.nodes)
        np.random.shuffle(nodes)

        # Remove nodes one by one and record the size of the giant component
        sizes = []
        for node in nodes:
            graph.remove_node(node)
            sizes.append(self._giant_component_size(graph))

        # Return the sizes as a fraction of the initial network size
        return [size / len(nodes) for size in sizes]

    def targeted_attack_resilience(self):
        # Clone the graph
        graph = self.graph.copy()

        # Get the nodes sorted by degree from high to low
        nodes = sorted(graph.nodes, key=graph.degree, reverse=True)

        # Remove nodes one by one and record the size of the giant component
        sizes = []
        for node in nodes:
            graph.remove_node(node)
            sizes.append(self._giant_component_size(graph))

        # Return the sizes as a fraction of the initial network size
        return [size / len(nodes) for size in sizes]

    @staticmethod
    def _giant_component_size(graph):
        # Get the sizes of all connected components
        sizes = [len(component) for component in nx.connected_components(graph)]

        # Return the size of the largest component
        return max(sizes) if sizes else 0

    def dijkstra_shortest_paths(self, source):
        # This returns both the paths and the lengths
        paths = nx.single_source_dijkstra_path(self.graph, source, weight='weight')
        lengths = nx.single_source_dijkstra_path_length(self.graph, source, weight='weight')
        return paths, lengths


    def floyd_warshall_shortest_paths(self):
        # Use the NetworkX function to calculate the shortest paths
        shortest_paths = dict(nx.floyd_warshall(self.graph))
        return shortest_paths
    
    def calculate_minimum_spanning_tree(self):
        """Calculate the Minimum Spanning Tree or Arborescence of the graph."""
        if self.graph.is_directed():
            try:
                msa = nx.minimum_spanning_arborescence(self.graph)
                tree_edges = [(source, target, attrs) for source, target, attrs in msa.edges(data=True)]
                formatted_edges = [{'source': source, 'target': target, 'weight': attrs.get('weight', 1)} for source, target, attrs in tree_edges]
                total_weight = sum(attrs.get('weight', 1) for _, _, attrs in tree_edges)
                return formatted_edges, total_weight
            except nx.NetworkXException as e:
                raise ValueError(f"An error occurred: {str(e)}")
        else:
            mst = nx.minimum_spanning_tree(self.graph, algorithm='prim')
            tree_edges = [(source, target, attrs) for source, target, attrs in mst.edges(data=True)]
            formatted_edges = [{'source': source, 'target': target, 'weight': attrs.get('weight', 1)} for source, target, attrs in tree_edges]
            total_weight = sum(attrs.get('weight', 1) for _, _, attrs in tree_edges)
            return formatted_edges, total_weight



    def global_clustering_coefficient(self):
        """Calculate the global clustering coefficient of the graph."""
        return nx.average_clustering(self.graph)

    def detect_communities_louvain(self):
        """
        Detect communities in the graph using the Louvain method.
        This function checks if the graph is directed and applies the
        appropriate Louvain method.
        """
        if isinstance(self.graph, nx.DiGraph):
            # If the graph is directed, you might convert it to undirected
            # for community detection, or use a directed community detection method
            # if available. Here we'll convert it to undirected for simplicity.
            undirected_graph = self.graph.to_undirected()
            partition = community_louvain.best_partition(undirected_graph)
        else:
            partition = community_louvain.best_partition(self.graph)
        return partition

    def find_strongly_connected_components(self):
        """Find all strongly connected components in the graph."""
        if not self.graph.is_directed():
            raise ValueError("Strongly connected components require a directed graph.")
        return list(nx.strongly_connected_components(self.graph))
    
    def calculate_routing_table(self, source):
        print("Calculating routing table...")
        print("Graph is directed:", self.graph.is_directed())
        print("Basic metrics: Nodes =", self.graph.number_of_nodes(), "Edges =", self.graph.number_of_edges())

        if not self.graph.has_node(source):
            raise ValueError("Source node does not exist in the graph.")

        try:
            all_paths = nx.single_source_dijkstra_path(self.graph, source)
            routing_table = {}

            for destination in self.graph.nodes():
                if destination == source:
                    routing_table[destination] = [destination]  # Node routes to itself
                elif destination in all_paths:
                    path = all_paths[destination]
                    first_hop = path[1] if len(path) > 1 else destination  # Ensuring there is a first hop
                    routing_table[destination] = [first_hop]
                else:
                    routing_table[destination] = ["Unreachable"]

            return routing_table
        except nx.NetworkXNoPath:
            raise ValueError("No path to one or more nodes.")
        except nx.NetworkXError as e:
            raise ValueError(f"NetworkX-specific error occurred: {e}")
        except Exception as e:
            raise ValueError(f"An unexpected error occurred while calculating the routing table: {e}")
    def print_constraints(self):
        """Prints the current constraints for the network design tool."""
        print("Current Constraints:")
        for constraint, value in self.constraints.items():
            print(f"{constraint}: {value}")

    def calculate_fault_tolerance_and_critical_edges(self):
        try:
            if isinstance(self.graph, nx.DiGraph):
                if not nx.is_weakly_connected(self.graph):
                    raise ValueError("The directed graph is not weakly connected.")
                # Assuming the graph has at least two nodes to form a valid edge cut
                from_node = next(iter(self.graph.nodes()))
                to_node = next((node for node in self.graph.nodes() if node != from_node), None)
            else:
                if not nx.is_connected(self.graph):
                    raise ValueError("The undirected graph is not connected.")
                # Similarly, pick two distinct nodes
                from_node, to_node = list(self.graph.nodes())[:2]

            if not from_node or not to_node:
                raise ValueError("Appropriate source or target node not found.")

            fault_tolerance = nx.edge_connectivity(self.graph, s=from_node, t=to_node)
            critical_edges_set = nx.minimum_edge_cut(self.graph, s=from_node, t=to_node)

            critical_edges = [
                {"source": u, "target": v, "weight": self.graph[u][v].get('weight', 1)}
                for (u, v) in critical_edges_set
            ]

            return fault_tolerance, critical_edges
        except Exception as e:
            print(f"An error occurred while calculating fault tolerance: {str(e)}")
            return None, f"Error: {str(e)}"


    def calculate_weighted_diameter_and_path(self):
        import networkx as nx
        from networkx.algorithms.shortest_paths.weighted import single_source_dijkstra

        # Check for connectivity based on graph type
        if self.graph.is_directed():
            if not nx.is_weakly_connected(self.graph):
                raise nx.NetworkXError("Directed graph is not weakly connected, cannot compute diameter.")
        else:
            if not nx.is_connected(self.graph):
                raise nx.NetworkXError("Undirected graph is not connected, cannot compute diameter.")
        
        # Initialize variables to store the maximum diameter found and the corresponding path
        diameter_value = 0
        path_edges = []

        # Determine the node to start from based on the graph type and configuration
        nodes_to_check = nx.weakly_connected_components(self.graph) if self.graph.is_directed() else [self.graph.nodes()]

        # Check the longest shortest path in the graph considering weights
        for component in nodes_to_check:
            for source in component:
                path_lengths, paths = single_source_dijkstra(self.graph, source=source, weight='weight')
                max_length = max(path_lengths.values())
                if max_length > diameter_value:
                    diameter_value = max_length
                    farthest_node = max(path_lengths, key=path_lengths.get)
                    path_nodes = paths[farthest_node]
                    path_edges = [{'source': path_nodes[i], 'target': path_nodes[i+1]} for i in range(len(path_nodes) - 1)]

        return diameter_value, path_edges

    

    def calculate_average_path_length(self):
        if self.graph.is_directed():
            # Check if the directed graph is strongly connected
            if not nx.is_strongly_connected(self.graph):
                raise nx.NetworkXError("The directed graph is not strongly connected.")
        else:
            # Check if the undirected graph is connected
            if not nx.is_connected(self.graph):
                raise nx.NetworkXError("The undirected graph is not connected.")

        # If the graph passes the connectivity test, calculate the average path length
        return nx.average_shortest_path_length(self.graph, weight='weight')












