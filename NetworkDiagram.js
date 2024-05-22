/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom"; // Import Link from react-router-dom
import classes from "./GraphWindow.module.css";
import logo from "./logo.png";
import { auth, db } from "./firebaseConfig"; // Importing our Firebase configuration
import { useLocation, useNavigate } from "react-router-dom";

import Popup from "reactjs-popup";

const NetworkDiagram = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const [graphType, setGraphType] = useState(
    queryParams.get("type") || "directed"
  );

  const [floydWarshallResults, setFloydWarshallResults] = useState(null);
  const [showFloydWarshallResults, setShowFloydWarshallResults] =
    useState(false);

  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  const [selectedNode, setSelectedNode] = useState(null);
  const [DoubleClikedNode1, setDobleCliked1] = useState(null);
  const [DoubleClikedNode2, setDobleCliked2] = useState(null);

  const [isShortestPathMode, setIsShortestPathMode] = useState(false);
  const [sourceNode, setSourceNode] = useState(null);
  const [targetNode, setTargetNode] = useState(null);
  const [isBFSMode, setIsBFSMode] = useState(false);
  const [isDFSMode, setIsDFSMode] = useState(false);
  const [isRoutingMode, setIsRoutingMode] = useState(false);
  const [edgesPath, setEdgesPath] = useState([]);

  // constraints
  const [maxEdgeWeight, setmaxEdgeWeight] = useState(0);

  const [maxDegree, setMaxDegree] = useState(0);

  useEffect(() => {
    navigate(`/NetworkDiagram?type=${graphType}`, { replace: true });
  }, [graphType]);

  useEffect(() => {
    if (maxDegree > 0) updateNodeColorsBasedOnDegree();
  }, [maxDegree]);

  // Function to update node colors based on their degree
  const updateNodeColorsBasedOnDegree = async () => {
    try {
      // Calculate the degree of each node
      const degrees = new Map();
      links.forEach((link) => {
        degrees.set(link.source, (degrees.get(link.source) || 0) + 1);
        degrees.set(link.target, (degrees.get(link.target) || 0) + 1);
      });

      // Update node colors if their degree is greater than maxDegree and collect nodes that exceed
      let nodesExceedingMax = [];
      const updatedNodes = nodes.map((node) => {
        const degree = degrees.get(node.id) || 0;
        if (degree > maxDegree) {
          nodesExceedingMax.push(node.id); // Add node to the list of nodes exceeding maxDegree
          return { ...node, color: "red" }; // Change color to red
        }
        return node;
      });

      setNodes(updatedNodes); // Update the nodes state with the new colors

      // Prepare the message for the alert
      let alertMessage;
      if (nodesExceedingMax.length > 0) {
        // Create a message listing all nodes exceeding the maxDegree
        alertMessage = `Nodes that have a degree more than the maximum degree (${maxDegree}) are: ${nodesExceedingMax.join(
          ", "
        )}.`;
      } else {
        // Message when no nodes exceed the maxDegree
        alertMessage = "All nodes comply with the maximum degree constraint.";
      }

      // Delay the alert and then reset colors after alert is closed
      setTimeout(() => {
        alert(alertMessage);
        // Reset node colors to LightSkyBlue
        setNodes(nodes.map((node) => ({ ...node, color: "LightSkyBlue" })));
      }, 500); // Delay of 500 milliseconds
    } catch (error) {
      console.error("Failed to update node colors based on degree:", error);
      alert(
        "An error occurred while updating node colors based on their degree."
      );
    }
    setMaxDegree(0);
  };

  const calculateMinimumFaultTolerance = async () => {
    try {
      const response2 = await fetch("http://AutoGrapher.site:5000/api/calculate-fault-tolerance", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response2.ok) {
        throw new Error("Network response was not ok " + response2.statusText);
      }

      const data2 = await response2.json();
      console.log(data2); // Log the received data for debugging

      setEdgesPath(data2.critical_edges);

      const pathString = data2.critical_edges
        .map((edge) => `${edge.source}->${edge.target}`)
        .join(", ");

      // Append only the target of each edge to the path string

      setTimeout(() => {
        alert(
          `Fault tolerance: ${
            data2.fault_tolerance - 1
          }\nCritical edges to consider: { ${pathString} }`
          // JSON.stringify(data2.critical_edges)
        );
        setEdgesPath([]); // Optionally clear the EdgesPath
      }, 500);
    } catch (error) {
      console.error("There was a problem with your fetch operation:", error);
      alert("Error fetching fault tolerance data: " + error.message);
    }
    // setminimumFaultTolerance(0);
  };

  function calculateAveragePathLength() {
    fetch("http://AutoGrapher.site:5000/api/calculate-average-path-length", {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert(`Error: ${data.error}`);
        } else {
          console.log("Average Path Length:", data.averagePathLength);
          alert(`The average distance is: ${data.averagePathLength}`);
        }
      })
      .catch((error) => {
        console.error("Error fetching the average path length:", error);
      });
  }

  function calculateMaxDiameter() {
    fetch("http://AutoGrapher.site:5000/api/calculate-diameter-path", {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          console.error("Error:", data.error);
        } else {
          console.log("Diameter:", data.diameter);
          console.log("Path:", data.path);
          setEdgesPath(data.path);
          setTimeout(() => {
            if (data.path.length > 0) {
              // Initialize the path string with the source of the first edge
              let pathString = `${data.path[0].source}`;

              // Append only the target of each edge to the path string
              data.path.forEach((edge) => {
                pathString += `->${edge.target}`;
              });

              alert(
                `Diameter weight: ${data.diameter}\nDiameter path: { ${pathString} }`
              );
              setEdgesPath([]);
            }
          }, 500);
        }
      })
      .catch((error) => {
        console.error("Error fetching the diameter path:", error);
      });
  }

  useEffect(() => {
    if (maxEdgeWeight > 0) {
      caculatemaxEdgeWeight();
    }
  }, [maxEdgeWeight]);

  function caculatemaxEdgeWeight() {
    let edges = links.filter((edge) => edge.weight > maxEdgeWeight);

    if (edges.length !== 0) {
      setEdgesPath((e) => [...e, ...edges]);

      let edgesPrint = "{";
      edges.forEach((e) => {
        edgesPrint += ` ${e.source} -> ${e.target},`;
      });
      edgesPrint += " }";

      setTimeout(() => {
        alert(`Edges that exceed the max edge weight: ${edgesPrint}`);
        setEdgesPath([]);
      }, 500);
    } else {
      alert(`All edge weights are less than ${maxEdgeWeight}`);
    }

    setmaxEdgeWeight(0);
  }

  const handleBFSClick = () => {
    setIsDijkstraMode(false);
    setIsShortestPathMode(false);
    setIsDFSMode(false);
    setIsRoutingMode(false);
    setIsBFSMode(true);

    setSourceNode(null);
    setTargetNode(null);
    alert("BFS mode activated. Please select a source node.");
  };

  const handleDFSClick = () => {
    setIsDijkstraMode(false);
    setIsShortestPathMode(false);
    setIsRoutingMode(false);
    setIsBFSMode(false);

    setIsDFSMode(true);

    setSourceNode(null);
    setTargetNode(null);
    alert("DFS mode activated. Please select a source node.");
  };
  const handleClusteringClick = () => {
    setIsDijkstraMode(false);
    setIsShortestPathMode(false);
    setIsDFSMode(false);
    setIsRoutingMode(false);
    setIsBFSMode(false);

    calculateClustering();
  };
  const handleStronglyConnectedComponentsClick = () => {
    setIsDijkstraMode(false);
    setIsShortestPathMode(false);
    setIsDFSMode(false);
    setIsRoutingMode(false);
    setIsBFSMode(false);

    findStronglyConnectedComponents();
  };
  const handleRoutingTableClick = () => {
    setIsDijkstraMode(false);
    setIsShortestPathMode(false);
    setIsDFSMode(false);
    setIsBFSMode(false);

    setIsRoutingMode(true);

    setSourceNode(null);
    alert("Routing table mode activated. Please select a source node.");
  };
  const handleNodeSelectionForRoutingTable = (nodeId) => {
    if (!isRoutingMode) return; // Ignore if not in shortest path mode

    if (!sourceNode) {
      CalculateRoutingTable(nodeId);

      // Reset for the next use
      setIsRoutingMode(false);
    }
  };

  const handleNodeSelectionForDFS = (nodeId) => {
    if (!isDFSMode) return; // Ignore if not in BFS mode

    // Set the selected node as the source for BFS's algorithm
    if (!sourceNode) {
      setSourceNode(nodeId);
      alert(`Source node selected: ${nodeId}. Please select the target node.`);
    } else if (!targetNode) {
      setTargetNode(nodeId);
      alert(`Target node selected: ${nodeId}.`);
      // setIsDFSMode(false); // Optionally turn off DFS mode
    }
  };

  const handleNodeSelectionForBFS = (nodeId) => {
    if (!isBFSMode) return; // Ignore if not in BFS mode

    // Set the selected node as the source for BFS's algorithm
    if (!sourceNode) {
      setSourceNode(nodeId);
      alert(`Source node selected: ${nodeId}. Please select the target node.`);
    } else if (!targetNode) {
      setTargetNode(nodeId);
      alert(`Target node selected: ${nodeId}.`);
      // setIsBFSMode(false); // Optionally turn off BFS mode
    }
  };

  const calculateClustering = async () => {
    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/detect-communities", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        const communities = data.communities;
        const uniqueCommunities = Object.values(communities).filter(
          (value, index, self) => self.indexOf(value) === index
        );
        const colors = generateUniqueColors(uniqueCommunities.length);

        const updatedNodes = nodes.map((node) => {
          const communityIndex = uniqueCommunities.indexOf(
            communities[node.id]
          );
          return {
            ...node,
            color: colors[communityIndex] || "LightSkyBlue", // Ensure there's a default color if not found
          };
        });

        setNodes(updatedNodes);

        // Delay the alert to allow users to notice the color change
        setTimeout(() => {
          alert(
            `Communities: ${JSON.stringify(
              Object.entries(communities).map(
                ([node, comm]) => `${node}: Community ${comm + 1}`
              )
            )}`
          );
          setNodes(nodes.map((node) => ({ ...node, color: "LightSkyBlue" }))); // Reset colors after alert
        }, 500);
      } else {
        alert(data.error || "Failed to calculate Clustering");
      }
    } catch (error) {
      console.error("Failed to fetch Clustering data:", error);
      alert("An error occurred while fetching the Clustering data.");
    }
  };

  // Generate unique colors
  function generateUniqueColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(`hsl(${(i * 360) / count}, 100%, 70%)`); // Generate HSL colors with equal spacing
    }
    return colors;
  }

  const findStronglyConnectedComponents = async () => {
    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/find-strong-components", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        const components = data.strongly_connected_components;
        const colors = generateUniqueColors(components.length); // Generate unique colors

        // Update colors temporarily
        const updatedNodes = nodes.map((node) => {
          const componentIndex = components.findIndex((component) =>
            component.includes(node.id)
          );
          return componentIndex !== -1
            ? { ...node, color: colors[componentIndex] } // Update color if node is part of a component
            : node;
        });

        setNodes(updatedNodes); // Apply the color update

        // Delay the alert to allow users to notice the color change
        setTimeout(() => {
          alert(`Strongly Connected Components: ${JSON.stringify(components)}`);
          // Reset colors after alert is closed
          setNodes(nodes.map((node) => ({ ...node, color: "LightSkyBlue" })));
        }, 500); // Delay of 500 milliseconds
      } else {
        alert(data.error || "Failed to fetch strongly connected components");
      }
    } catch (error) {
      console.error("Failed to fetch strongly connected components:", error);
      alert(
        "An error occurred while fetching the strongly connected components."
      );
    }
  };

  const calculatePrimsMST = async () => {
    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/calculate-mst-msa", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        setEdgesPath(data.tree_edges); // Highlight the edges
        setTimeout(() => {
          alert(
            `Total weight: ${
              data.total_weight
            } \nMinimum spanning tree edges: ${data.tree_edges
              .map((edge) => `${edge.source}-${edge.target}`)
              .join(",  ")},`
          );
          setEdgesPath([]); // Clear the highlighted edges after the alert is closed
        }, 500); // Adjust the delay as needed
      } else {
        alert(data.error || "Failed to calculate MST/MSA");
      }
    } catch (error) {
      console.error("Failed to fetch MST/MSA:", error);
      alert("An error occurred while fetching the MST/MSA.");
    }
  };

  const CalculateRoutingTable = async (sourceNode) => {
    if (!sourceNode) {
      alert(
        "Please provide a valid source node before fetching the routing table."
      );
      return;
    }

    try {
      const response = await fetch(
        `http://AutoGrapher.site:5000/api/calculate-routing-table?source=${sourceNode}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setRoutingTableData(data.routing_table);
        setShowRoutingTable(true);
      } else {
        alert(data.error || "Failed to fetch the routing table");
      }
    } catch (error) {
      console.error("Failed to fetch the routing table:", error);
      alert("An error occurred while fetching the routing table.");
    }
  };

  const [isDraggingRT, setIsDraggingRT] = useState(false);
  const [rtPosition, setRtPosition] = useState({ x: 0, y: 0 });
  const [isRTMinimized, setIsRTMinimized] = useState(false);
  const [routingTableData, setRoutingTableData] = useState([]);
  const [showRoutingTable, setShowRoutingTable] = useState(false);

  const toggleRTMinimize = () => {
    setIsRTMinimized(!isRTMinimized);
  };

  const startDragRT = (e) => {
    setIsDraggingRT(true);
    const rect = rtResultsRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Set the initial offset
    setRtPosition({ x: offsetX, y: offsetY });
  };

  const onDragRT = (e) => {
    if (isDraggingRT && rtResultsRef.current) {
      // Include scroll offsets in the calculation
      const newX = e.clientX - rtPosition.x + window.scrollX;
      const newY = e.clientY - rtPosition.y + window.scrollY;

      // Apply the new position to the RT results element
      rtResultsRef.current.style.position = "absolute";
      rtResultsRef.current.style.left = `${newX}px`;
      rtResultsRef.current.style.top = `${newY}px`;
    }
  };

  const endDragRT = () => {
    setIsDraggingRT(false);
  };

  useEffect(() => {
    const handleMouseMove = (e) => onDragRT(e);
    const handleMouseUp = () => endDragRT();

    if (isDraggingRT) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingRT]); // Depend on isDraggingRT to manage listeners efficiently

  const rtResultsRef = useRef(null);

  const calculateDFSPath = async (sourceNode, targetNode) => {
    if (!sourceNode || !targetNode) {
      alert("DFS: Please select both a source and a target node.");
      return;
    }
    if (sourceNode === targetNode) {
      alert("DFS: The source and target node cannot be the same.");
      return;
    }

    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/calculate-dfs-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: sourceNode, target: targetNode }),
      });
      const data = await response.json();
      if (response.ok) {
        setEdgesPath(data.edges); // Set the edges to be highlighted

        // Use setTimeout to delay the alert and clearing of edges
        setTimeout(() => {
          alert(`DFS path: {${data.visit_order.join(", ")}}`);
          setEdgesPath([]); // Clear the highlighted edges after the alert is closed
        }, 500); // Adjust the delay as needed (500 milliseconds here)
      } else {
        alert(data.error || "Failed to calculate DFS path");
      }
    } catch (error) {
      console.error("Failed to fetch DFS path:", error);
      alert("An error occurred while fetching the DFS path.");
    }
  };

  const calculateBFSPath = async (sourceNode, targetNode) => {
    if (!sourceNode || !targetNode) {
      alert("BFS: Please select both a source and a target node.");
      return;
    }
    if (sourceNode === targetNode) {
      alert("BFS: The source and target node cannot be the same.");
      return;
    }

    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/calculate-bfs-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: sourceNode, target: targetNode }),
      });
      const data = await response.json();
      if (response.ok) {
        setEdgesPath(data.edges); // Set the edges to be highlighted
        setTimeout(() => {
          alert(`BFS path: {${data.path.join(", ")}}`);
          setEdgesPath([]); // Clear the highlighted edges after the alert is closed
        }, 500); // Adjust the delay as needed
      } else {
        alert(data.error || "Failed to calculate BFS path");
      }
    } catch (error) {
      console.error("Failed to fetch BFS path:", error);
      alert("An error occurred while fetching the BFS path.");
    }
  };

  const handleDijkstraClick = () => {
    // Activate Dijkstra mode
    setIsDijkstraMode(true);
    // Reset previously selected nodes if necessary
    setSourceNode(null);
    alert("Dijkstra mode activated. Please select a source node.");
  };

  const calculateAndDisplayShortestPath = async (sourceId, targetId) => {
    const requestBody = {
      source: sourceId,
      target: targetId,
    };

    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/calculate-shortest-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();

        // Convert path to edges if your visualization requires edge format
        const edges = data.path.slice(1).map((node, index) => ({
          source: data.path[index],
          target: node,
        }));

        // Assuming setEdgesPath is a function that updates the visualization to highlight paths
        setEdgesPath(edges);

        // Display the path information after setting the edges, then clear the highlight
        setTimeout(() => {
          const pathAsString = data.path.join(" -> ");
          alert(
            `Total weight: ${data.total_weight}\nShortest path: ${pathAsString}`
          );
          setEdgesPath([]); // Clear the highlighted path after the alert
        }, 500);
      } else {
        console.error("Failed to calculate the shortest path");
        alert("Failed to calculate the shortest path.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`Error: ${error}`);
    }
  };

  const handleNodeSelectionForDijkstra = (nodeId) => {
    if (!isDijkstraMode) return; // Ignore if not in Dijkstra mode

    // Set the selected node as the source for Dijkstra's algorithm
    setSourceNode(nodeId);
    alert(`Source node for Dijkstra's algorithm selected: ${nodeId}.`);
    // Proceed to call the backend for Dijkstra's shortest path calculation
    calculateDijkstraShortestPath(nodeId);

    // Reset for the next use
    setIsDijkstraMode(false);
  };
  const calculateDijkstraShortestPath = async (sourceId) => {
    const requestBody = { source: sourceId };

    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/dijkstra-shortest-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.paths && data.lengths) {
          // Assuming 'convertPathsToEdges' prepares the data for visual representation

          // Prepare the data for display in the UI component, similar to a routing table

          setShowDijkstraTable(true);
          setDijkstraTableData(data.lengths);
        } else {
          console.error("Shortest paths data is missing from the response.");
        }
      } else {
        const error = await response.text(); // Handle textual error messages
        console.error("Failed to fetch the shortest paths:", error);
      }
    } catch (error) {
      console.error("Error fetching the shortest paths: ", error);
    }
  };
  const [isDijkstraMinimized, setIsDijkstraMinimized] = useState(false);
  const [showDijkstraTable, setShowDijkstraTable] = useState(false);
  const [dijkstraTableData, setDijkstraTableData] = useState({});
  const [isDraggingDijkstra, setIsDraggingDijkstra] = useState(false);
  const [dijkstraPosition, setDijkstraPosition] = useState({ x: 0, y: 0 });
  const dijkstraResultsRef = useRef(null);
  const startDragDijkstra = (e) => {
    setIsDraggingDijkstra(true);
    const rect = dijkstraResultsRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDijkstraPosition({ x: offsetX, y: offsetY });
  };

  const onDragDijkstra = (e) => {
    if (isDraggingDijkstra && dijkstraResultsRef.current) {
      const newX = e.clientX - dijkstraPosition.x + window.scrollX;
      const newY = e.clientY - dijkstraPosition.y + window.scrollY;
      dijkstraResultsRef.current.style.position = "absolute";
      dijkstraResultsRef.current.style.left = `${newX}px`;
      dijkstraResultsRef.current.style.top = `${newY}px`;
    }
  };

  const endDragDijkstra = () => {
    setIsDraggingDijkstra(false);
  };
  useEffect(() => {
    const handleMouseMove = (e) => onDragDijkstra(e);
    const handleMouseUp = () => endDragDijkstra();

    if (isDraggingDijkstra) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingDijkstra]);
  const toggleDijkstraMinimize = () => {
    setIsDijkstraMinimized(!isDijkstraMinimized);
  };

  // Add useEffect hook to react to changes in graphType and communicate with the backend
  useEffect(() => {
    updateGraphTypeOnBackend(graphType);
  }, [graphType]);

  useEffect(() => {
    setIsGraphDirected(graphType === "directed");
  }, [graphType]);
  // Function to send a request to the backend to update the graph type
  const updateGraphTypeOnBackend = async (newGraphType) => {
    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/update-graph-type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ graphType: newGraphType }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // const data = await response.json();
      // console.log("Graph type updated:", data.message);
    } catch (error) {
      // console.error("Could not update graph type:", error);
    }
  };

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    node: null,
    link: null, // Add link property to context menu state
  });
  const calculateAndDisplayFloydWarshall = async () => {
    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/floyd-warshall", { method: "GET" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const { shortest_paths: shortestPaths } = data;

      // Assuming 'shortestPaths' contains the full matrix and keys are the node IDs
      const nodeIds = Object.keys(shortestPaths).sort((a, b) => a - b); // Sort node IDs numerically

      // Transform the shortest paths data into a matrix format, preserving the order of node IDs
      const transformedMatrix = nodeIds.map((rowKey) =>
        nodeIds.map((colKey) =>
          shortestPaths[rowKey][colKey] !== undefined
            ? shortestPaths[rowKey][colKey]
            : "∞"
        )
      );

      setNodeIds(nodeIds); // Update the state with node IDs
      setFloydWarshallResults(transformedMatrix); // Update the state with the results
      setShowFloydWarshallResults(true);
    } catch (error) {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
      alert(`Error: ${error.message}`);
    }
  };

  // Add state for drag state and position
  const [isDraggingFW, setIsDraggingFW] = useState(false);

  const [isFWMinimized, setIsFWMinimized] = useState(false);

  const getScrollY = () => {
    return window.scrollY;
  };

  const toggleFWMinimize = () => {
    setIsFWMinimized(!isFWMinimized);
  };

  const startDragFW = (e) => {
    setIsDraggingFW(true);
    const rect = fwResultsRef.current.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Set the initial offset
    setOffset({ x: offsetX, y: offsetY });
  };

  const onDragFW = (e) => {
    if (isDraggingFW && fwResultsRef.current) {
      // Include scroll offsets in the calculation
      const newX = e.clientX - offset.x + window.scrollX;
      const newY = e.clientY - offset.y + window.scrollY;

      // Apply the new position to the FW results element
      fwResultsRef.current.style.left = `${newX}px`;
      fwResultsRef.current.style.top = `${newY}px`;
    }
  };

  const endDragFW = () => {
    setIsDraggingFW(false);
  };
  useEffect(() => {
    const handleMouseMove = (e) => onDragFW(e);
    const handleMouseUp = () => endDragFW();

    if (isDraggingFW) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingFW]); // Depend on isDraggingFW to manage listeners efficiently

  const fwResultsRef = useRef(null);

  const svgRef = useRef(null);

  useEffect(() => {
    hanldeNodeDoubleClick();
  }, [DoubleClikedNode2]);

  const hanldeNodeDoubleClickHelper = (nodeId) => {
    if (DoubleClikedNode1 === null) {
      setDobleCliked1(nodeId);
    } else if (DoubleClikedNode2 === null && DoubleClikedNode1 !== nodeId) {
      setDobleCliked2(nodeId);
    } else if (DoubleClikedNode1 === nodeId) {
      setDobleCliked1(null);
    }
  };
  const isBidirectionalAndEqualWeight = (source, target, weight, links) => {
    const reverseLink = links.find(
      (link) => link.source === target && link.target === source
    );
    return reverseLink && reverseLink.weight === weight;
  };
  const [isGraphDirected, setIsGraphDirected] = useState(true);

  // Adjusted hanldeNodeDoubleClick function
  const hanldeNodeDoubleClick = async () => {
    if (DoubleClikedNode1 !== null && DoubleClikedNode2 !== null) {
      const linkExists = links.some(
        (link) =>
          link.source === DoubleClikedNode1 && link.target === DoubleClikedNode2
      );

      if (!linkExists) {
        let weight = prompt("Enter link weight:", "1");
        weight = parseInt(weight, 10);
        if (isNaN(weight)) {
          // alert("Invalid weight");
          setDobleCliked1(null);
          setDobleCliked2(null);
          return;
        }

        // This function needs to be implemented to fetch the current maximum edge weight
        // Fetch or use a cached version of the maximum allowed edge weight

        try {
          const response = await fetch("http://AutoGrapher.site:5000/api/add-edge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: DoubleClikedNode1,
              target: DoubleClikedNode2,
              weight,
            }),
          });

          if (!response.ok) {
            const { error } = await response.json();
            alert(`Failed to add edge: ${error}`);
            setDobleCliked1(null);
            setDobleCliked2(null);
            return;
          }

          const { newLink } = await response.json();
          setLinks((prevLinks) => [...prevLinks, newLink]);
          setDobleCliked1(null);
          setDobleCliked2(null);
        } catch (error) {
          console.error(error);
          alert(error.message);
        }
      } else {
        alert("A link between these nodes already exists.");
      }

      setDobleCliked1(null);
      setDobleCliked2(null);
    }
  };

  // Example of fetching max edge weight (you need to implement the API endpoint for this)
  async function fetchMaxEdgeWeight() {
    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/get-max-edge-weight");
      if (!response.ok) throw new Error("Failed to fetch max edge weight");
      const data = await response.json();
      return data.maxEdgeWeight;
    } catch (error) {
      console.error("Error fetching max edge weight:", error);
      return Infinity; // Default to a high value if fetch fails
    }
  }

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const handleReload = async () => {
      if (sessionStorage.getItem("isReloaded")) {
        // Function to reset the graph
        await ResetGraph(new Event("click"), graphType);
      }
      sessionStorage.setItem("isReloaded", "true");
    };

    handleReload();

    return () => {
      sessionStorage.removeItem("isReloaded");
    };
  }, [graphType]);

  const ResetGraph = async (e, graphType) => {
    e.preventDefault();

    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/reset-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ graphType: graphType }),
      });

      const data = await response.json();
      console.log(data.message);

      // Update React state to reflect the reset graph
      setGraphType(graphType);
      setNodes([]);
      setLinks([]);
      navigate(`/NetworkDiagram?type=${graphType}`, { replace: true });
    } catch (error) {
      console.error("Failed to reset the graph:", error);
    }
  };

  // Authentication State Observer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        // loadGraphData(user.uid); // Load graph data if user is logged in
      }
    });

    return () => unsubscribe();
  }, []);

  const loadGraphDataAndAddToBackend = (userId) => {
    console.log("Loading graph data for user ID:", userId);
    db.collection("graphs")
      .doc(userId)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const graphData = doc.data();
          console.log("Graph data loaded:", graphData);
          const { nodes, links, isDirected } = graphData;

          // Map nodes and set a uniform color
          const formattedNodes = nodes.map((node) => ({
            ...node,
            color: "LightSkyBlue", // Set the color to LightSkyBlue
          }));

          setNodes(formattedNodes);
          setLinks(links);
          setIsGraphDirected(isDirected);

          // Compute maximum dimensions needed to fit all nodes in viewport units
          // Assume that 100px = 5vw as an example conversion, adjust as needed
          const pxToVW = window.innerWidth / 100; // 1vw unit
          const pxToVH = window.innerHeight / 100; // 1vh unit
          const maxNodeWidthVW =
            (formattedNodes.reduce((max, node) => Math.max(max, node.x), 0) +
              450) /
            pxToVW;
          const maxNodeHeightVH =
            (formattedNodes.reduce((max, node) => Math.max(max, node.y), 0) +
              450) /
            pxToVH;

          console.log(
            "Calculated SVG dimensions:",
            maxNodeWidthVW + "vw",
            maxNodeHeightVH + "vh"
          );

          // Update SVG/container width and height to use viewport units
          if (svgRef.current) {
            svgRef.current.style.width = `${maxNodeWidthVW + 10}vw`;
            svgRef.current.style.height = `${maxNodeHeightVH + 10}vh`;
            svgRef.current.style.overflow = "auto"; // Enable scrolling within the SVG container
            console.log(
              "SVG dimensions set to:",
              svgRef.current.style.width,
              svgRef.current.style.height
            );
          }

          // Navigate based on whether the graph is directed
          if (isDirected) {
            navigate(`/NetworkDiagram?type=directed`, { replace: true });
          } else {
            navigate(`/NetworkDiagram?type=undirected`, { replace: true });
          }

          addToBackend({ nodes: formattedNodes, links, isDirected });
        } else {
          console.log("No graph data found for user ID:", userId);
        }
      })
      .catch((error) => {
        console.error("Error loading graph data:", error);
      });
  };

  const addToBackend = async (graphData) => {
    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/add-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(graphData),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      console.log("Response from backend:", result);
    } catch (error) {
      console.error("Failed to add graph data to backend:", error);
    }
  };

  // Save Graph Data

  // Updated to reflect direct usage of nodes and links states
  const saveGraphData = () => {
    if (!currentUser) {
      alert("You have to login to save graph");
      return;
    }

    const graphData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
      })),
      links: links.map((link) => ({
        source: link.source,
        target: link.target,
        weight: link.weight,
      })),
      isDirected: isGraphDirected, // Save the directedness of the graph
    };

    db.collection("graphs")
      .doc(currentUser.uid)
      .set(graphData)
      .then(() => {
        alert("Graph data saved successfully!");
        // setShowGraphOptions(false); // Hide the graph options menu
      })
      .catch((error) => {
        console.error("Error saving graph data:", error);
        // setShowGraphOptions(false); // Optionally hide the graph options menu even on failure
      });
  };
  const handleAddNode = async () => {
    const scrollPosition = { x: window.scrollX, y: window.scrollY };
    let maxId = nodes.reduce((max, node) => Math.max(max, node.id), 0); // Find the highest ID

    let newNode = {
      id: maxId + 1, // Increment the maximum ID found
      x: scrollPosition.x + 300,
      y: scrollPosition.y + 300,
      color: "LightSkyBlue",
    };

    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/add-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNode),
      });
      console.log(response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Node added:", data);

      // Assuming the response includes the node data correctly
      // Replace `newNode` with `data` if the server responds with the complete new node object
      setNodes([...nodes, newNode]);
    } catch (error) {
      console.error("Could not add node:", error);
    }
  };

  const handleMouseDown = (nodeId, event) => {
    event.preventDefault();
    setSelectedNode(nodeId);
  };

  const handleMouseMove = (event) => {
    if (selectedNode !== null && svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect();
      const svgX = event.clientX - svgRect.left;
      const svgY = event.clientY - svgRect.top;

      // Update node position
      const updatedNodes = nodes.map((node) =>
        node.id === selectedNode ? { ...node, x: svgX, y: svgY } : node
      );
      setNodes(updatedNodes);

      // Dynamically adjust the canvas size and background
      extendCanvas(svgX, svgY, svgRect);
    }
  };

  function extendCanvas(svgX, svgY, svgRect) {
    // Define smaller increments and larger thresholds for extension
    const increment = 50; // smaller increment than before
    const threshold = 100; // larger threshold for more space before triggering

    // Extend right
    if (svgX >= svgRect.right - threshold) {
      svgRef.current.style.width = `${
        svgRef.current.clientWidth + increment
      }px`;
    }

    // Extend left
    if (svgX <= svgRect.left + threshold) {
      const newWidth = svgRef.current.clientWidth + increment;
      svgRef.current.style.width = `${newWidth}px`;
      svgRef.current.style.left = `${svgRef.current.offsetLeft - increment}px`;
      smoothScrollTo(
        svgRef.current.offsetLeft - increment,
        svgRef.current.offsetTop
      );
    }

    // Extend down
    if (svgY >= svgRect.bottom - threshold) {
      svgRef.current.style.height = `${
        svgRef.current.clientHeight + increment
      }px`;
    }

    // Extend up
    if (svgY <= svgRect.top + threshold) {
      const newHeight = svgRef.current.clientHeight + increment;
      svgRef.current.style.height = `${newHeight}px`;
      svgRef.current.style.top = `${svgRef.current.offsetTop - increment}px`;
      smoothScrollTo(
        svgRef.current.offsetLeft,
        svgRef.current.offsetTop - increment
      );
    }
  }

  function smoothScrollTo(x, y) {
    window.scrollTo({
      left: x,
      top: y,
      behavior: "smooth",
    });
  }

  const showNodeContextMenu = (e, node) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node: node,
    });
  };
  function displayWeight(weight) {
    // Check if weight is very close to 0, considering floating-point precision
    return Math.abs(weight) < 1e-8 ? "0" : weight.toString();
  }
  const showLinkContextMenu = (e, link) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      link: link,
    });
  };
  const handleShortestPathClick = () => {
    setIsBFSMode(false);
    setIsDijkstraMode(false);
    setIsRoutingMode(false);
    setIsDijkstraMode(false);

    setIsShortestPathMode(true);

    setSourceNode(null);
    setTargetNode(null);
    alert(
      "Shortest path mode activated. Please select source and target nodes."
    );
  };

  const hideContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, node: null, link: null });
  };

  const deleteLink = async () => {
    if (contextMenu.link) {
      try {
        const response = await fetch("http://AutoGrapher.site:5000/api/delete-edge", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: contextMenu.link.source,
            target: contextMenu.link.target,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data.message);
        // Remove the link in the frontend state
        setLinks(
          links.filter((link) => {
            return !(
              (link.source === contextMenu.link.source &&
                link.target === contextMenu.link.target) ||
              (!isGraphDirected &&
                link.source === contextMenu.link.target &&
                link.target === contextMenu.link.source)
            );
          })
        );
      } catch (error) {
        console.error("Could not delete link:", error);
        // Optionally, handle error (e.g., show an error message)
      }

      hideContextMenu();
    }
  };

  const changeLinkWeight = async () => {
    if (contextMenu.link) {
      const newWeight = prompt(
        "Enter new weight for the link:",
        contextMenu.link.weight
      );
      const parsedWeight = parseFloat(newWeight);
      if (!isNaN(parsedWeight) && newWeight !== null) {
        const maxEdgeWeight = await fetchMaxEdgeWeight(); // Fetch or use a cached version of the maximum allowed edge weight

        if (parsedWeight > maxEdgeWeight) {
          alert(`Weight exceeds the maximum allowed limit of ${maxEdgeWeight}`);

          return;
        }
        try {
          const response = await fetch("http://AutoGrapher.site:5000/api/change-edge-weight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: contextMenu.link.source,
              target: contextMenu.link.target,
              newWeight: parsedWeight,
            }),
          });

          if (!response.ok) throw new Error(await response.text());

          // Assuming the backend successfully updates the weight without returning the full updated link list,
          // update the weight in the frontend state directly.
          setLinks((links) =>
            links.map((link) => {
              if (
                link.source === contextMenu.link.source &&
                link.target === contextMenu.link.target
              ) {
                // Update the weight of the matched link
                return { ...link, weight: parsedWeight };
              }
              return link; // Return the link unchanged if it's not the one being updated
            })
          );

          // alert("Weight updated successfully.");
        } catch (error) {
          console.error("Error updating link weight:", error);
          alert(`Failed to update weight: ${error.message}`);
        }
      }
      hideContextMenu();
    }
  };
  const handleExportClick = async () => {
    try {
      // Assume 'nodes' array contains objects with 'id', 'x', and 'y' representing positions
      const positions = nodes.reduce((acc, node) => {
        acc[node.id] = { x: node.x, y: node.y };
        return acc;
      }, {});

      const response = await fetch("http://AutoGrapher.site:5000/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ positions }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "network.graphml";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error(
          "Failed to export the graph, server responded with an error."
        );
        alert("Failed to export the graph.");
      }
    } catch (error) {
      console.error("Failed to export the graph:", error);
      alert("Failed to export the graph.");
    }
  };

  const handleNodeSelection = (nodeId) => {
    if (!isShortestPathMode) return; // Ignore if not in shortest path mode

    if (!sourceNode) {
      setSourceNode(nodeId);
      alert(`Source node selected: ${nodeId}. Now select the target node.`);
    } else {
      setTargetNode(nodeId);
      alert(`Target node selected: ${nodeId}.`);
      // Notice: We're not doing anything else here
    }
  };
  useEffect(() => {
    if (sourceNode !== null && targetNode !== null) {
      // Both source and target have been selected, proceed with the operation

      // Reset for the next use
      if (isShortestPathMode) {
        calculateAndDisplayShortestPath(sourceNode, targetNode);
        setIsShortestPathMode(false);
      } else if (isBFSMode) {
        calculateBFSPath(sourceNode, targetNode);
        setIsBFSMode(false);
      } else if (isDFSMode) {
        calculateDFSPath(sourceNode, targetNode);
        setIsDFSMode(false);
      }

      setSourceNode(null);
      setTargetNode(null);
    }
  }, [sourceNode, targetNode]);
  const [isDijkstraMode, setIsDijkstraMode] = useState(false); // New state for Dijkstra's mode

  // Modify existing functions or add new ones here

  useEffect(() => {
    document.addEventListener("click", hideContextMenu);
    return () => {
      document.removeEventListener("click", hideContextMenu);
    };
  }, []);

  const handleMouseUp = () => {
    setSelectedNode(null);
  };
  const [nodeIds, setNodeIds] = useState([]); // This will hold the node IDs corresponding to rows and columns

  // Assuming this function is defined inside your component
  const calculateAdjacencyMatrix = async () => {
    try {
      const response = await fetch("http://AutoGrapher.site:5000/api/get-adjacency-matrix");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAdjacencyMatrix(data.matrix); // Assuming matrix is part of the response
      setNodeIds(data.sortedNodes); // Assuming sorted node IDs are also part of the response
      console.log("Matrix fetched:", data.matrix);
    } catch (error) {
      console.error("Error fetching adjacency matrix:", error);
    }
  };
  const [adjacencyMatrix, setAdjacencyMatrix] = useState([]);

  // Make sure to call `calculateAdjacencyMatrix` at the appropriate place in your component,
  // for example, inside a useEffect hook for it to run when the component mounts or certain conditions are met.
  useEffect(() => {
    calculateAdjacencyMatrix();
  }, []);

  const handleDeleteNode = async () => {
    if (contextMenu.node) {
      const nodeIdToDelete = contextMenu.node.id;

      try {
        const response = await fetch("http://AutoGrapher.site:5000/api/delete-node", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: nodeIdToDelete }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data.message);
        // Node deleted successfully in backend, now update frontend
        const updatedNodes = nodes.filter((node) => node.id !== nodeIdToDelete);
        setNodes(updatedNodes);

        // Also, remove any links connected to this node
        const updatedLinks = links.filter(
          (link) =>
            link.source !== nodeIdToDelete && link.target !== nodeIdToDelete
        );
        setLinks(updatedLinks);
      } catch (error) {
        console.error("Could not delete node:", error);
        // Optionally, handle error (e.g., show an error message)
      }

      // Close the context menu regardless of the outcome
      hideContextMenu();
    }
  };

  const isLinkBidirectionalAndShouldCurve = (source, target, links) => {
    const directLinkExists = links.some(
      (link) => link.source === source && link.target === target
    );
    const reverseLinkExists = links.some(
      (link) => link.source === target && link.target === source
    );
    return directLinkExists && reverseLinkExists && source > target; // Curve if source ID is greater than target ID
  };
  const handleChangeNodeId = async () => {
    if (contextMenu.node) {
      const oldNodeId = contextMenu.node.id;
      const newNodeId = parseInt(prompt("Enter new node ID:", oldNodeId));

      if (!isNaN(newNodeId) && !nodes.some((node) => node.id === newNodeId)) {
        try {
          const response = await fetch("http://AutoGrapher.site:5000/api/change-node-id", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ oldNodeId, newNodeId }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log(data.message);

          // Update node in nodes array only if backend confirms the change
          const updatedNodes = nodes.map((node) =>
            node.id === oldNodeId ? { ...node, id: newNodeId } : node
          );
          setNodes(updatedNodes);

          // Update links array
          const updatedLinks = links.map((link) => ({
            ...link,
            source: link.source === oldNodeId ? newNodeId : link.source,
            target: link.target === oldNodeId ? newNodeId : link.target,
          }));
          setLinks(updatedLinks);
        } catch (error) {
          console.error("Could not change node ID:", error);
          alert("Invalid ID or operation failed.");
        }
      } else {
        alert("Invalid ID or ID already exists.");
      }

      // Close context menu regardless of the outcome
      hideContextMenu();
    }
  };

  const [showAdjacencyMatrix, setShowAdjacencyMatrix] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const matrixRef = useRef(null); // Ref for the draggable element
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const startDrag = (e) => {
    setDragging(true);

    // Calculate the initial offset from the top-left corner of the popup to the mouse's position
    const offsetX = e.clientX - matrixRef.current.getBoundingClientRect().left;
    const offsetY = e.clientY - matrixRef.current.getBoundingClientRect().top;

    // Set the initial offset and position
    setOffset({ x: offsetX, y: offsetY });
  };

  const onDrag = (e) => {
    if (dragging) {
      // Calculate new position based on the cursor's current position minus the initial offset
      const newX = e.clientX - offset.x + window.scrollX;
      const newY = e.clientY - offset.y + window.scrollY;

      // Update the position state

      // Apply the new position to the matrix element
      matrixRef.current.style.left = `${newX}px`;
      matrixRef.current.style.top = `${newY}px`;
    }
  };

  const endDrag = () => {
    setDragging(false);
  };

  const [componentHeight, setComponentHeight] = useState("50vh"); // Default height

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setComponentHeight(isMinimized ? "50vh" : "50px"); // Minimize to 50px height or restore to 50vh
  };

  const handleClose = () => {
    setShowAdjacencyMatrix(false); // Hide the component
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onDrag);
      window.addEventListener("mouseup", endDrag);
    }

    return () => {
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", endDrag);
    };
  }, [dragging]);

  const handleAdjacencyMatrixClick = () => {
    setShowAdjacencyMatrix(true); // Display the adjacency matrix section
    calculateAdjacencyMatrix(); // Fetch and update the adjacency matrix
    // Also, close the graph options menu if it's open
    // setShowGraphOptions(false);
  };
  // This is already correctly  in your component

  const fileInputRef = useRef(null);
  const initialFileProcessed = useRef(false);

  useEffect(() => {
    const { file } = location.state || {};
    if (file && !initialFileProcessed.current) {
      handleFileUpload(file);
      initialFileProcessed.current = true; // Mark as processed
    }
  }, [location.state]); // Trigger on location.state changes but with conditions

  useEffect(() => {
    const { type } = location.state || {};
    if (type) {
      setGraphType(type);
    }
  }, [location.state]); // Handles type changes independently
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file); // Proceed to upload
    }
  };

  const handleFileUpload = (file) => {
    if (!file) {
      console.log("No file selected.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    fetch("http://AutoGrapher.site:5000/api/import", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          // Convert non-OK HTTP responses into errors so they can be caught by the catch block
          return response.json().then((data) => Promise.reject(data));
        }
      })
      .then((data) => {
        // Assuming data.nodes is an array with positions `x` and `y` returned by the backend
        const formattedNodes = data.nodes.map((node) => ({
          ...node, // Keep attributes from the server
          color: "LightSkyBlue", // Set the color to LightSkyBlue
        }));

        // Compute maximum dimensions needed to fit all nodes in viewport units
        const pxToVW = window.innerWidth / 100; // Conversion to 1vw
        const pxToVH = window.innerHeight / 100; // Conversion to 1vh
        const maxNodeWidthVW =
          (formattedNodes.reduce((max, node) => Math.max(max, node.x), 0) +
            500) /
          pxToVW;
        const maxNodeHeightVH =
          (formattedNodes.reduce((max, node) => Math.max(max, node.y), 0) +
            500) /
          pxToVH;

        console.log(
          "Calculated SVG dimensions:",
          maxNodeWidthVW + "vw",
          maxNodeHeightVH + "vh"
        );

        // Update SVG/container width and height to use viewport units
        if (svgRef.current) {
          svgRef.current.style.width = `${maxNodeWidthVW}vw`;
          svgRef.current.style.height = `${maxNodeHeightVH}vh`;
          svgRef.current.style.overflow = "auto"; // Enable scrolling within the SVG container
          console.log(
            "SVG dimensions set to:",
            svgRef.current.style.width,
            svgRef.current.style.height
          );
        }

        setNodes(formattedNodes);
        setLinks(data.links);
        setGraphType(data.graphType);
      })
      .catch((error) => {
        // Handle network errors and JSON parsing errors
        console.error("Error:", error.message || error);
      });
  };

  function startResize(e, componentRef) {
    if (!componentRef.current) {
      console.error("Resizable element not found");
      return; // Exit if the element ref is not attached
    }

    e.stopPropagation(); // Prevents dragging when resizing
    const initialWidth = componentRef.current.offsetWidth;
    const initialHeight = componentRef.current.offsetHeight;
    const startX = e.clientX;
    const startY = e.clientY;

    function doResize(moveEvent) {
      const newWidth = initialWidth + (moveEvent.clientX - startX);
      const newHeight = initialHeight + (moveEvent.clientY - startY);
      componentRef.current.style.width = `${newWidth}px`;
      componentRef.current.style.height = `${newHeight}px`;
    }

    function stopResize() {
      window.removeEventListener("mousemove", doResize);
      window.removeEventListener("mouseup", stopResize);
    }

    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
  }

  return (
    //////////////////return

    <div>
      <div className={classes.TopBar}>
        <header>
          {" "}
          <title> AutoGrapher</title>
        </header>
        <img
          src={logo}
          alt="Logo"
          onClick={() => (window.location.href = "../")}
          style={{
            position: "absolute",
            height: "10vh",
            width: "10vh",
            top: "0",
            left: "0",
            userSelect: "none",
            // pointerEvents: "none",
          }}
        />

        <div style={{ marginLeft: "5vw" }}>
          <b
            className={classes.text}
            style={{ userSelect: "none", pointerEvents: "none" }}
          >
            {" "}
            AutoGrapher
          </b>

          
              <a
                className={classes.TextButton}
                style={{ userSelect: "none" }}
                onClick={handleExportClick}
                // Add this line to call uploadMatrix method
              >
                Export
              </a>
           
                   

          <input
            type="file"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            ref={fileInputRef}
          />
          <a
            onClick={() => fileInputRef.current.click()}
            className={classes.TextButton2}
            style={{ userSelect: "none" }}
          >
            Import
          </a>

          <a style={{ userSelect: "none" }}>
            <Link
              to="http://autograph.rf.gd"
              className={classes.TextButton2}
              style={{ userSelect: "none", textDecoration: "none" }}
            >
              Help
            </Link>
          </a>

          <Link to={currentUser ? "/NetworkDiagram" : "../login"}>
            <button
              className={classes.button}
              style={{ userSelect: "none" }}
              onClick={() => {
                if (currentUser) {
                  auth.signOut(); // Sign out the user
                  alert("Logged out successfully");
                }
              }}
            >
              {currentUser ? "Logout" : "Login"}
            </button>
          </Link>
        </div>
      </div>
      <div className={classes.body}>
        <div className={classes.TopBar2}>
          <Popup
            trigger={
              <button
                className={classes.operationsButtons}
                style={{ userSelect: "none", marginLeft: "5vw" }}
                // onClick={}
              >
                Graph
              </button>
            }
            nested
          >
            {(close1) => (
              <div
                id="graph-options"
                style={{
                  backgroundColor: "#f9f9f9",
                  border: "1px solid #ddd",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                  borderRadius: "1vh",
                  padding: "1vh",
                  minWidth: "13vw",
                  zIndex: 1000,
                  fontFamily: "Arial, sans-serif",

                  fontSize: "1.9vh",
                  userSelect: "none",
                }}
                onMouseLeave={(e) => {
                  close1();
                }}
              >
                <ul
                  style={{
                    listStyleType: "none",
                    margin: 0,
                    padding: 0,
                    color: "black",
                  }}
                >
                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={handleAdjacencyMatrixClick}
                  >
                    Adjacency matrix
                  </li>

                  <Popup
                    modal
                    nested
                    contentStyle={{
                      position: "absolute",
                      top: "10vh",
                      left: "37vw",
                    }}
                    trigger={
                      <li
                        style={{
                          padding: "0.8vh",
                          borderRadius: "0.6vh",
                          margin: "0.09vh 0",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#e8e8e8")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                        onClick={null}
                      >
                        Load graph
                      </li>
                    }
                  >
                    {(close) => (
                      <div
                        className={classes.popup}
                        style={{ padding: "1vh 4vw", paddingRight: "2vw" }}
                      >
                        <div className="content" style={{ fontSize: "2vh" }}>
                          Are you sure do you want to load the graph ?
                        </div>
                        <div>
                          <button
                            style={{
                              position: "absolute",
                              left: "0%",
                              marginLeft: "2vw",
                              width: "2.7vw",
                              height: "3vh",
                              borderRadius: "1vh",
                              fontSize: "1.5vh",
                              marginTop: "8vh",
                            }}
                            onClick={() => {
                              close();
                              // close1();
                            }}
                          >
                            No
                          </button>
                          <button
                            style={{
                              width: "2.8vw",
                              height: "3vh",
                              borderRadius: "1vh",
                              fontSize: "1.5vh",
                              marginTop: "8vh",
                              marginLeft: "18vw",
                            }}
                            onClick={(e) => {
                              close();
                              close1();
                              if (currentUser) {
                                loadGraphDataAndAddToBackend(currentUser.uid);
                              } else {
                                alert("You have to login to load graph");
                              }
                            }}
                          >
                            Yes
                          </button>
                        </div>
                      </div>
                    )}
                  </Popup>

                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={saveGraphData}
                  >
                    Save
                  </li>

                  <Popup
                    modal
                    nested
                    contentStyle={{
                      position: "absolute",
                      top: "10vh",
                      left: "37vw",
                    }}
                    trigger={
                      <li
                        style={{
                          padding: "0.8vh",
                          borderRadius: "0.6vh",
                          margin: "0.09vh 0",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#e8e8e8")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                        onClick={null}
                      >
                        new graph
                      </li>
                    }
                  >
                    {(close) => (
                      <div
                        className={classes.popup}
                        style={{ padding: "1vh 4vw", paddingRight: "5vw" }}
                      >
                        <div className="content" style={{ fontSize: "2vh" }}>
                          Do you want directed or undirected graph ?
                        </div>
                        <div>
                          <button
                            style={{
                              position: "absolute",
                              left: "0%",
                              marginLeft: "2vw",
                              width: "4vw",
                              height: "3vh",
                              borderRadius: "1vh",
                              fontSize: "1.5vh",
                              marginTop: "8vh",
                            }}
                            onClick={(e) => {
                              close();
                              close1();
                              ResetGraph(e, "directed");
                            }}
                          >
                            directed
                          </button>
                          <button
                            style={{
                              width: "4.6vw",
                              height: "3vh",
                              borderRadius: "1vh",
                              fontSize: "1.5vh",
                              marginTop: "8vh",
                            }}
                            onClick={(e) => {
                              close();
                              close1();
                              ResetGraph(e, "undirected");
                            }}
                          >
                            undirected
                          </button>
                        </div>
                      </div>
                    )}
                  </Popup>

                  <Popup
                    modal
                    nested
                    contentStyle={{
                      position: "absolute",
                      top: "10vh",
                      left: "37vw",
                    }}
                    trigger={
                      <li
                        style={{
                          padding: "0.8vh",
                          borderRadius: "0.6vh",
                          margin: "0.09vh 0",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#e8e8e8")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                        onClick={null}
                      >
                        Draw star graph
                      </li>
                    }
                  >
                    {(close) => (
                      <div
                        className={classes.popup}
                        style={{ padding: "2vh 2vw 2vh" }}
                      >
                        <div className="content" style={{ fontSize: "2vh" }}>
                          Enter numbre of nodes
                        </div>
                        <input
                          id="StarGraph"
                          type="number"
                          min="1"
                          style={{
                            borderRadius: "1vh",
                            height: "2.3vh",
                            fontSize: "1.5vh",
                          }}
                        />
                        <button
                          style={{
                            borderRadius: "0.8vh",
                            height: "3vh",
                            width: "5vh",
                            fontSize: "1.5vh",
                          }}
                          onClick={async (e) => {
                            close();
                            close1();
                            const numNodes =
                              document.getElementById("StarGraph").value;
                            if (!numNodes || isNaN(numNodes)) {
                              alert("Please enter a valid number of nodes.");
                              return;
                            }

                            try {
                              const response = await fetch(
                                "http://AutoGrapher.site:5000/api/create_star_graph",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ num_nodes: numNodes }),
                                }
                              );
                              console.log(response);
                              if (response.ok) {
                                const data = await response.json();
                                if (data.error) {
                                  console.error("Backend error:", data.error);
                                } else {
                                  if (data.nodes && data.links) {
                                    const baseRadius = 150; // Start with a sensible minimum for small node counts
                                    const scalingFactor = 8; // Scaling factor for radius calculation
                                    const radius =
                                      baseRadius + numNodes * scalingFactor; // Logarithmic scaling

                                    const margin = 200; // Additional margin
                                    const operationBarHeight = 150; // Height of the operation bar
                                    const extraTopMargin = 50; // Extra margin for spacing below the operation bar

                                    const centerX = radius + margin + 300; // X-coordinate of the center node
                                    const centerY =
                                      radius +
                                      margin -
                                      250 +
                                      operationBarHeight +
                                      extraTopMargin; // Y-coordinate adjusted below the operation bar

                                    const canvasWidth =
                                      2 * radius + 2 * (margin + 300);
                                    const canvasHeight =
                                      2 * radius +
                                      2 * margin +
                                      operationBarHeight +
                                      extraTopMargin;

                                    // Adjust SVG canvas size if necessary
                                    if (svgRef.current) {
                                      if (
                                        svgRef.current.clientWidth < canvasWidth
                                      ) {
                                        svgRef.current.style.width = `${canvasWidth}px`;
                                      }
                                      if (
                                        svgRef.current.clientHeight <
                                        canvasHeight
                                      ) {
                                        svgRef.current.style.height = `${canvasHeight}px`;
                                      }
                                    }

                                    const formattedNodes = data.nodes.map(
                                      (node, index) => {
                                        if (index === 0) {
                                          // Assuming the first node is the central node
                                          return {
                                            ...node,
                                            id: parseInt(node.id),
                                            x: centerX,
                                            y: centerY,
                                            color: "LightSkyBlue",
                                          };
                                        } else {
                                          const angle =
                                            ((index - 1) /
                                              (data.nodes.length - 1)) *
                                            2 *
                                            Math.PI; // Calculate angle
                                          return {
                                            ...node,
                                            id: parseInt(node.id),
                                            x:
                                              centerX +
                                              radius * Math.cos(angle),
                                            y:
                                              centerY +
                                              radius * Math.sin(angle),
                                            color: "LightSkyBlue",
                                          };
                                        }
                                      }
                                    );

                                    const formattedLinks = data.links.map(
                                      (link) => ({
                                        ...link,
                                        source: parseInt(link.source),
                                        target: parseInt(link.target),
                                        weight: parseInt(link.weight),
                                      })
                                    );

                                    setNodes(formattedNodes);
                                    setLinks(formattedLinks);
                                  }
                                }
                              } else {
                                console.error(
                                  "HTTP Error:",
                                  response.statusText
                                );
                              }
                            } catch (error) {
                              console.error("Failed to fetch:", error);
                            }
                          }}
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </Popup>
                  <Popup
                    modal
                    nested
                    contentStyle={{
                      position: "absolute",
                      top: "10vh",
                      left: "37vw",
                    }}
                    trigger={
                      <li
                        style={{
                          padding: "0.8vh",
                          borderRadius: "0.6vh",
                          margin: "0.09vh 0",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#e8e8e8")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                        onClick={null}
                      >
                        Draw ring graph
                      </li>
                    }
                  >
                    {(close) => (
                      <div
                        className={classes.popup}
                        style={{ padding: "2vh 2vw 2vh" }}
                      >
                        <div className="content" style={{ fontSize: "2vh" }}>
                          Enter numbre of nodes
                        </div>
                        <input
                          id="RingGraph"
                          type="number"
                          min="1"
                          style={{
                            borderRadius: "1vh",
                            height: "2.3vh",
                            fontSize: "1.5vh",
                          }}
                        />
                        <button
                          style={{
                            borderRadius: "0.8vh",
                            height: "3vh",
                            width: "5vh",
                            fontSize: "1.5vh",
                          }}
                          onClick={async (e) => {
                            close();
                            close1();

                            const numNodes =
                              document.getElementById("RingGraph").value;
                            if (!numNodes || isNaN(numNodes)) {
                              alert("Please enter a valid number of nodes.");
                              return;
                            }

                            try {
                              const response = await fetch(
                                "http://AutoGrapher.site:5000/api/create_ring_graph",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ num_nodes: numNodes }),
                                }
                              );

                              if (response.ok) {
                                const data = await response.json();
                                if (data.error) {
                                  console.error("Backend error:", data.error);
                                } else {
                                  if (data.nodes && data.links) {
                                    // Lowered the minimum, maximum, and scaling factor for a smaller circle
                                    const minRadius = 100; // Reduced minimum radius
                                    // const maxRadius = 800; // Reduced maximum radius
                                    const scalingFactor = 15; // Smaller scaling factor to limit size

                                    // Calculate the radius with proportional scaling
                                    let radius =
                                      minRadius + numNodes * scalingFactor;
                                    // if (radius > maxRadius) {
                                    //   radius = maxRadius;
                                    // }

                                    const margin = 50; // Reduced margin to minimize space
                                    const operationBarHeight = 150; // Height of the operation bar
                                    const extraTopMargin = 50; // Extra margin for spacing below the operation bar

                                    const centerX = radius + margin + 500; // X-coordinate of the center node
                                    const centerY =
                                      radius +
                                      margin -
                                      100 +
                                      operationBarHeight +
                                      extraTopMargin; // Y-coordinate adjusted below the operation bar

                                    const canvasWidth =
                                      2 * radius + 2 * (margin + 500);
                                    const canvasHeight =
                                      2 * radius +
                                      2 * (margin + 100) +
                                      operationBarHeight +
                                      extraTopMargin;

                                    // Adjust SVG canvas size if necessary
                                    if (svgRef.current) {
                                      if (
                                        svgRef.current.clientWidth < canvasWidth
                                      ) {
                                        svgRef.current.style.width = `${canvasWidth}px`;
                                      }
                                      if (
                                        svgRef.current.clientHeight <
                                        canvasHeight
                                      ) {
                                        svgRef.current.style.height = `${canvasHeight}px`;
                                      }
                                    }

                                    const formattedNodes = data.nodes.map(
                                      (node, index, array) => {
                                        const angle =
                                          (index / array.length) * 2 * Math.PI; // Angle for this node
                                        return {
                                          ...node,
                                          id: parseInt(node.id),
                                          x: centerX + radius * Math.cos(angle),
                                          y: centerY + radius * Math.sin(angle),
                                          color: "LightSkyBlue",
                                        };
                                      }
                                    );

                                    const formattedLinks = data.links.map(
                                      (link) => ({
                                        ...link,
                                        source: parseInt(link.source),
                                        target: parseInt(link.target),
                                        weight: parseInt(link.weight),
                                      })
                                    );

                                    setNodes(formattedNodes);
                                    setLinks(formattedLinks);
                                  }
                                }
                              } else {
                                console.error(
                                  "HTTP Error:",
                                  response.statusText
                                );
                              }
                            } catch (error) {
                              console.error("Failed to fetch:", error);
                            }
                          }}
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </Popup>
                  <Popup
                    modal
                    nested
                    contentStyle={{
                      position: "absolute",
                      top: "10vh",
                      left: "37vw",
                    }}
                    trigger={
                      <li
                        style={{
                          padding: "0.8vh",
                          borderRadius: "0.6vh",
                          margin: "0.09vh 0",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#e8e8e8")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                        onClick={null}
                      >
                        Draw bus graph
                      </li>
                    }
                  >
                    {(close) => (
                      <div
                        className={classes.popup}
                        style={{ padding: "2vh 2vw 2vh" }}
                      >
                        <div className="content" style={{ fontSize: "2vh" }}>
                          Enter numbre of nodes
                        </div>
                        <input
                          id="BusGraph"
                          type="number"
                          min="1"
                          style={{
                            borderRadius: "1vh",
                            height: "2.3vh",
                            fontSize: "1.5vh",
                          }}
                        />
                        <button
                          style={{
                            borderRadius: "0.8vh",
                            height: "3vh",
                            width: "5vh",
                            fontSize: "1.5vh",
                          }}
                          onClick={async (e) => {
                            close();
                            close1();

                            const numNodes =
                              document.getElementById("BusGraph").value;
                            if (!numNodes || isNaN(numNodes)) {
                              alert("Please enter a valid number of nodes.");
                              return;
                            }

                            try {
                              const response = await fetch(
                                "http://AutoGrapher.site:5000/api/create_bus_graph",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ num_nodes: numNodes }),
                                }
                              );

                              if (response.ok) {
                                const data = await response.json();
                                if (data.error) {
                                  console.error("Backend error:", data.error);
                                } else {
                                  if (data.nodes && data.links) {
                                    const nodeSpacing = 100; // Space between nodes
                                    const totalWidth =
                                      data.nodes.length * nodeSpacing + 20; // Adjust the width calculation as needed

                                    // Adjust SVG width if needed
                                    if (
                                      svgRef.current &&
                                      svgRef.current.clientWidth < totalWidth
                                    ) {
                                      svgRef.current.style.width = `${
                                        totalWidth + 100
                                      }px`; // Update SVG width to fit all nodes
                                    }

                                    const formattedNodes = data.nodes.map(
                                      (node, index) => ({
                                        ...node,
                                        id: parseInt(node.id),
                                        x: 200 + index * nodeSpacing, // Calculate x position based on index
                                        y: 250, // Maintain a fixed y position for simplicity
                                        color: "LightSkyBlue",
                                      })
                                    );

                                    const formattedLinks = data.links.map(
                                      (link) => ({
                                        ...link,
                                        source: parseInt(link.source),
                                        target: parseInt(link.target),
                                        weight: parseInt(link.weight),
                                      })
                                    );

                                    setNodes(formattedNodes);
                                    setLinks(formattedLinks);
                                  }
                                }
                              } else {
                                console.error(
                                  "HTTP Error:",
                                  response.statusText
                                );
                              }
                            } catch (error) {
                              console.error("Failed to fetch:", error);
                            }
                          }}
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </Popup>
                  <Popup
                    modal
                    nested
                    contentStyle={{
                      position: "absolute",
                      top: "10vh",
                      left: "37vw",
                    }}
                    trigger={
                      <li
                        style={{
                          padding: "0.8vh",
                          borderRadius: "0.6vh",
                          margin: "0.09vh 0",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#e8e8e8")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "transparent")
                        }
                        onClick={null}
                      >
                        Draw fully connected graph
                      </li>
                    }
                  >
                    {(close) => (
                      <div
                        className={classes.popup}
                        style={{ padding: "2vh 2vw 2vh" }}
                      >
                        <div className="content" style={{ fontSize: "2vh" }}>
                          Enter numbre of nodes
                        </div>
                        <input
                          id="MeshGraph"
                          type="number"
                          min="1"
                          style={{
                            borderRadius: "1vh",
                            height: "2.3vh",
                            fontSize: "1.5vh",
                          }}
                        />
                        <button
                          style={{
                            borderRadius: "0.8vh",
                            height: "3vh",
                            width: "5vh",
                            fontSize: "1.5vh",
                          }}
                          onClick={async (e) => {
                            close();
                            close1();

                            try {
                              const numNodes = parseInt(
                                document.getElementById("MeshGraph").value
                              );
                              const response = await fetch(
                                "http://AutoGrapher.site:5000/api/create_mesh_graph",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ num_nodes: numNodes }),
                                }
                              );

                              if (response.ok) {
                                const data = await response.json();
                                console.log("Full response data:", data);
                                if (data.error) {
                                  console.error("Backend error:", data.error);
                                } else {
                                  if (data.nodes && data.links) {
                                    // Assuming grid placement
                                    const gridSize = Math.ceil(
                                      Math.sqrt(numNodes)
                                    );
                                    const nodeSpacing = 270;
                                    const margin = 50;
                                    const operationBarHeight = 150;
                                    const centerX = margin + 500;
                                    const centerY = margin + operationBarHeight;

                                    // Set canvas size
                                    const canvasWidth =
                                      centerX +
                                      nodeSpacing * gridSize +
                                      (margin + 500);
                                    const canvasHeight =
                                      centerY + nodeSpacing * gridSize + margin;
                                    if (svgRef.current) {
                                      svgRef.current.style.width = `${canvasWidth}px`;
                                      svgRef.current.style.height = `${canvasHeight}px`;
                                    }

                                    // Position nodes and curve links
                                    const formattedNodes = data.nodes.map(
                                      (node, index) => {
                                        const row = Math.floor(
                                          index / gridSize
                                        );
                                        const col = index % gridSize;
                                        return {
                                          ...node,
                                          id: parseInt(node.id),
                                          x: centerX + col * nodeSpacing,
                                          y: centerY + row * nodeSpacing,
                                          color: "LightSkyBlue",
                                        };
                                      }
                                    );

                                    const formattedLinks = data.links.map(
                                      (link, index) => {
                                        const sourceNode = formattedNodes.find(
                                          (node) =>
                                            node.id === parseInt(link.source)
                                        );
                                        const targetNode = formattedNodes.find(
                                          (node) =>
                                            node.id === parseInt(link.target)
                                        );

                                        const dx = targetNode.x - sourceNode.x;
                                        const dy = targetNode.y - sourceNode.y;
                                        const dr = Math.sqrt(dx * dx + dy * dy);

                                        // Bezier curve path
                                        const path = `M${sourceNode.x},${sourceNode.y}A${dr},${dr} 0 0,1 ${targetNode.x},${targetNode.y}`;

                                        return {
                                          ...link,
                                          source: parseInt(link.source),
                                          target: parseInt(link.target),
                                          weight: parseInt(link.weight),
                                          path: path, // Add path for curved link
                                        };
                                      }
                                    );

                                    setNodes(formattedNodes);
                                    setLinks(formattedLinks);
                                  }
                                }
                              } else {
                                console.error(
                                  "HTTP Error:",
                                  response.statusText
                                );
                              }
                            } catch (error) {
                              console.error("Failed to fetch:", error);
                            }
                          }}
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </Popup>
                </ul>
              </div>
            )}
          </Popup>

          <button
            className={classes.operationsButtons}
            style={{ userSelect: "none" }}
            onClick={handleAddNode}
          >
            {" "}
            Add vertex
          </button>

          <Popup
            trigger={
              <button
                className={classes.operationsButtons}
                style={{ userSelect: "none" }}
                // onClick={toggleAlgorithmsMenu}
              >
                Algorithms
              </button>
            }
            nested
            // contentStyle={{position: 'fixed',top:'15%', left:'30%'}}
          >
            {(close1) => (
              <div
                id="algorithms-menu"
                style={{
                  backgroundColor: "#f9f9f9",
                  border: "1px solid #ddd",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                  borderRadius: "1vh",
                  minWidth: "20vw",
                  padding: "1vh",

                  zIndex: 1000,
                  fontFamily: "Arial, sans-serif",

                  fontSize: "1.9vh",
                  userSelect: "none",
                }}
                onMouseLeave={(e) => {
                  close1();
                }}
              >
                <ul
                  style={{
                    listStyleType: "none",
                    margin: 0,
                    padding: 0,
                    color: "black",
                  }}
                >
                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={(e) => handleShortestPathClick()}
                  >
                    Shortest path
                  </li>

                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={() => {
                      // close1();
                      calculateAndDisplayFloydWarshall();
                    }}
                  >
                    All nodes shortest path (Floyd-warshall)
                  </li>
                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={handleDijkstraClick}
                  >
                    Single node all nodes shortest path (Dijkstra)
                  </li>

                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={handleBFSClick}
                  >
                    BFS
                  </li>
                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={handleDFSClick}
                  >
                    DFS
                  </li>
                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={handleRoutingTableClick}
                  >
                    Routing table
                  </li>

                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={() => {
                      close1();
                      handleClusteringClick();
                    }}
                  >
                    Clustring
                  </li>

                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={() => {
                      close1();
                      handleStronglyConnectedComponentsClick();
                    }}
                  >
                    Strong connected algorithm
                  </li>
                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={() => {
                      close1();
                      calculatePrimsMST();
                    }}
                  >
                    Minimum spanning tree (Prim)
                  </li>

                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={(e) => {
                      close1();
                      calculateMaxDiameter();
                    }}
                  >
                    Diameter
                  </li>

                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={(e) => {
                      close1();
                      setTimeout(() => {
                        calculateAveragePathLength();
                      }, 100);
                    }}
                  >
                    Average distance
                  </li>

                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={(e) => {
                      close1();
                      calculateMinimumFaultTolerance();
                    }}
                  >
                    Fault tolerance
                  </li>
                </ul>
              </div>
            )}
          </Popup>

          <Popup
            trigger={
              <button
                className={classes.operationsButtons}
                style={{ userSelect: "none" }}
              >
                Constraints and improvements
              </button>
            }
            nested
          >
            {(close1) => (
              <div
                id="Constraints-menu"
                style={{
                  // position: "absolute",
                  backgroundColor: "#f9f9f9",
                  border: "1px solid #ddd",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                  borderRadius: "1vh",
                  minWidth: "10vw",
                  padding: "1vh",

                  zIndex: 1000,
                  fontFamily: "Arial, sans-serif",

                  fontSize: "1.9vh",
                  userSelect: "none",
                }}
                onMouseLeave={(e) => {
                  close1();
                }}
              >
                <ul
                  style={{
                    listStyleType: "none",
                    margin: 0,
                    padding: 0,
                    color: "black",
                  }}
                >
                  <li
                    style={{
                      padding: "0.8vh",
                      borderRadius: "0.6vh",
                      margin: "0.09vh 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={(e) => close1()}
                  >
                    To be implemented
                  </li>
                </ul>
              </div>
            )}
          </Popup>
        </div>

        {/* ////////////////////////// */}

        <div>
          <div>
            <div>
              <div>
                {showFloydWarshallResults && (
                  <div
                    ref={fwResultsRef}
                    style={{
                      position: "absolute",
                      top: `${200 + 800 * 0.2}px`,
                      left: `${200 + 3500 * 0.2}px`,
                      backgroundColor: "#fff",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                      padding: "2vh",
                      borderRadius: "1vh",
                      zIndex: 1001,
                      color: "black",
                      width: "30vw",
                      height: isFWMinimized ? "6.1vh" : "30vh",
                      cursor: "move",
                      resize: "both",
                      overflow: "hidden",
                      userSelect: "none",
                    }}
                    onMouseDown={startDragFW}
                  >
                    <h2 style={{ fontSize: "3vh", margin: 0 }}>
                      Floyd-Warshall
                    </h2>
                    <div
                      style={{ position: "absolute", top: "1vh", right: "1vw" }}
                    >
                      <button
                        onClick={toggleFWMinimize}
                        className={classes.floydButton}
                        style={{
                          borderRadius: "0.6vh",
                          border: "0.5vh",
                          padding: "0.8vh",
                          minWidth: "4vw",
                          marginRight: "1vw",
                          fontSize: "1.5vh",
                        }}
                      >
                        {isFWMinimized ? "Restore" : "Minimize"}
                      </button>
                      <button
                        onClick={() => setShowFloydWarshallResults(false)}
                        className={classes.floydButton}
                        style={{
                          borderRadius: "0.6vh",
                          border: "0.5vh",
                          padding: "0.8vh",
                          minWidth: "4vw",
                          fontSize: "1.5vh",
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        width: "20px",
                        height: "20px",
                        backgroundColor: "#ccc",
                        cursor: "se-resize",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseDown={(e) => startResize(e, fwResultsRef)}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 10 L10 0 M7 1 L10 1 L10 3 M1 10 L1 7 L3 7"
                          stroke="gray"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    {!isFWMinimized && (
                      <div
                        style={{
                          marginTop: "2vh",
                          overflow: "auto",
                          height: "calc(100% - 4vh)",
                        }}
                      >
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{ padding: "4px", textAlign: "center" }}
                              ></th>
                              {nodeIds.map((id) => (
                                <th
                                  key={id}
                                  style={{
                                    padding: "4px",
                                    textAlign: "center",
                                  }}
                                >
                                  {id}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {floydWarshallResults.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                <td
                                  style={{
                                    padding: "4px",
                                    fontWeight: "bold",
                                    textAlign: "center",
                                  }}
                                >
                                  {nodeIds[rowIndex]}
                                </td>
                                {row.map((distance, colIndex) => (
                                  <td
                                    key={colIndex}
                                    style={{
                                      textAlign: "center",
                                      padding: "4px",
                                      border: "1px solid #ddd",
                                    }}
                                  >
                                    {distance}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {showAdjacencyMatrix && (
                  <div
                    ref={matrixRef}
                    style={{
                      position: "absolute",
                      top: `${getScrollY() + 800 * 0.2}px`,
                      left: `${window.scrollX + 3500 * 0.2}px`,
                      backgroundColor: "#fff",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                      padding: "2vh",
                      borderRadius: "1vh",
                      zIndex: 1001,
                      color: "black",
                      width: "30vw",
                      height: isMinimized ? "6.1vh" : componentHeight,
                      cursor: "move",
                      resize: "both",
                      overflow: "hidden",
                      userSelect: "none",
                    }}
                    onMouseDown={startDrag}
                  >
                    <h2 style={{ fontSize: "3vh", margin: 0 }}>
                      Adjacency Matrix
                    </h2>
                    <div
                      style={{ position: "absolute", top: "1vh", right: "1vw" }}
                    >
                      <button
                        onClick={toggleMinimize}
                        className={classes.floydButton}
                        style={{
                          borderRadius: "0.6vh",
                          border: "0.5vh",
                          padding: "0.8vh",
                          minWidth: "4vw",
                          marginRight: "1vw",
                          fontSize: "1.5vh",
                        }}
                      >
                        {isMinimized ? "Restore" : "Minimize"}
                      </button>
                      <button
                        onClick={handleClose}
                        className={classes.floydButton}
                        style={{
                          borderRadius: "0.6vh",
                          border: "0.5vh",
                          padding: "0.8vh",
                          minWidth: "4vw",
                          fontSize: "1.5vh",
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        width: "20px",
                        height: "20px",
                        backgroundColor: "#ccc",
                        cursor: "se-resize",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseDown={(e) => startResize(e, matrixRef)}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 10 L10 0 M7 1 L10 1 L10 3 M1 10 L1 7 L3 7"
                          stroke="gray"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    {!isMinimized && (
                      <div
                        style={{
                          marginTop: "2vh",
                          overflow: "auto",
                          height: "calc(100% - 4vh)",
                        }}
                      >
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{ padding: "4px", textAlign: "center" }}
                              ></th>
                              {nodeIds.map((id) => (
                                <th
                                  key={id}
                                  style={{
                                    padding: "4px",
                                    textAlign: "center",
                                  }}
                                >
                                  {id}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {adjacencyMatrix.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                <td
                                  style={{
                                    padding: "4px",
                                    fontWeight: "bold",
                                    textAlign: "center",
                                  }}
                                >
                                  {nodeIds[rowIndex]}
                                </td>
                                {row.map((cell, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    style={{
                                      textAlign: "center",
                                      padding: "4px",
                                      border: "1px solid #ddd",
                                    }}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {showRoutingTable && (
                  <div
                    ref={rtResultsRef}
                    style={{
                      position: "absolute",
                      top: `${window.scrollY + 800 * 0.2}px`,
                      left: `${window.scrollX + 3500 * 0.2}px`,
                      backgroundColor: "#fff",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                      padding: "2vh",
                      borderRadius: "1vh",
                      zIndex: 1001,
                      color: "black",
                      width: "30vw",
                      height: isRTMinimized ? "6.1vh" : "30vh",
                      cursor: "move",
                      resize: "both",
                      overflow: "hidden",
                      userSelect: "none",
                    }}
                    onMouseDown={startDragRT}
                  >
                    <h2 style={{ fontSize: "3vh", margin: 0 }}>
                      Routing Table
                    </h2>
                    <div
                      style={{ position: "absolute", top: "1vh", right: "1vw" }}
                    >
                      <button
                        onClick={toggleRTMinimize}
                        className={classes.floydButton}
                        style={{
                          borderRadius: "0.6vh",
                          border: "0.5vh",
                          padding: "0.8vh",
                          minWidth: "4vw",
                          marginRight: "1vw",
                          fontSize: "1.5vh",
                        }}
                      >
                        {isRTMinimized ? "Restore" : "Minimize"}
                      </button>
                      <button
                        onClick={() => setShowRoutingTable(false)}
                        className={classes.floydButton}
                        style={{
                          borderRadius: "0.6vh",
                          border: "0.5vh",
                          padding: "0.8vh",
                          minWidth: "4vw",
                          fontSize: "1.5vh",
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        width: "20px",
                        height: "20px",
                        backgroundColor: "#ccc",
                        cursor: "se-resize",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseDown={(e) => startResize(e, rtResultsRef)}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 10 L10 0 M7 1 L10 1 L10 3 M1 10 L1 7 L3 7"
                          stroke="gray"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    {!isRTMinimized && (
                      <div
                        style={{
                          marginTop: "2vh",
                          overflow: "auto",
                          height: "calc(100% - 4vh)",
                        }}
                      >
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{ padding: "4px", textAlign: "center" }}
                              >
                                node
                              </th>
                              <th
                                style={{ padding: "4px", textAlign: "center" }}
                              >
                                hop
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(routingTableData).map(
                              ([destination, costArray]) => (
                                <tr key={destination}>
                                  <td
                                    style={{
                                      padding: "4px",
                                      textAlign: "center",
                                      border: "1px solid #ddd",
                                    }}
                                  >
                                    {destination}
                                  </td>
                                  <td
                                    style={{
                                      padding: "4px",
                                      textAlign: "center",
                                      border: "1px solid #ddd",
                                    }}
                                  >
                                    {costArray.join(", ")}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                {showDijkstraTable && (
                  <div
                    ref={dijkstraResultsRef}
                    style={{
                      position: "absolute",
                      top: `${window.scrollY + 100}px`, // Adjusted for demonstration
                      left: `${window.scrollX + 100}px`, // Adjusted for demonstration
                      backgroundColor: "#fff",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                      padding: "2vh",
                      borderRadius: "1vh",
                      zIndex: 1001,
                      color: "black",
                      width: "30vw",
                      height: isDijkstraMinimized ? "6.1vh" : "30vh",
                      cursor: "move",
                      resize: "both",
                      overflow: "hidden",
                      userSelect: "none",
                    }}
                    onMouseDown={startDragDijkstra}
                  >
                    <h2 style={{ fontSize: "3vh", margin: 0 }}>
                      Dijkstra's Shortest Paths
                    </h2>
                    <div
                      style={{ position: "absolute", top: "1vh", right: "1vw" }}
                    >
                      <button
                        onClick={toggleDijkstraMinimize}
                        className={classes.floydButton}
                        style={{
                          borderRadius: "0.6vh",
                          border: "0.5vh",
                          padding: "0.8vh",
                          minWidth: "4vw",
                          marginRight: "1vw",
                          fontSize: "1.5vh",
                        }}
                      >
                        {isDijkstraMinimized ? "Restore" : "Minimize"}
                      </button>
                      <button
                        onClick={() => setShowDijkstraTable(false)}
                        className={classes.floydButton}
                        style={{
                          borderRadius: "0.6vh",
                          border: "0.5vh",
                          padding: "0.8vh",
                          minWidth: "4vw",
                          fontSize: "1.5vh",
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "0",
                        right: "0",
                        width: "20px",
                        height: "20px",
                        backgroundColor: "#ccc",
                        cursor: "se-resize",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseDown={(e) => startResize(e, dijkstraResultsRef)}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 10 L10 0 M7 1 L10 1 L10 3 M1 10 L1 7 L3 7"
                          stroke="gray"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    {!isDijkstraMinimized && (
                      <div
                        style={{
                          marginTop: "2vh",
                          overflow: "auto",
                          height: "calc(100% - 4vh)",
                        }}
                      >
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{ padding: "4px", textAlign: "center" }}
                              >
                                Destination
                              </th>
                              <th
                                style={{ padding: "4px", textAlign: "center" }}
                              >
                                Distance
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(dijkstraTableData).map(
                              ([destination, distance]) => (
                                <tr key={destination}>
                                  <td
                                    style={{
                                      padding: "4px",
                                      textAlign: "center",
                                      border: "1px solid #ddd",
                                    }}
                                  >
                                    {destination}
                                  </td>
                                  <td
                                    style={{
                                      padding: "4px",
                                      textAlign: "center",
                                      border: "1px solid #ddd",
                                    }}
                                  >
                                    {distance}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <svg
            ref={svgRef}
            width="100vw"
            height="100vh"
            display="block"
            // backgroundColor="black"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Draw links */}

            {links.map((link, index) => {
              const sourceNode = nodes.find((node) => node.id === link.source);
              const targetNode = nodes.find((node) => node.id === link.target);
              if (!sourceNode || !targetNode) return null; // Skip if nodes are not found

              // Check if the current link is in the edges array
              let isHighlighted = false;
              if (edgesPath.length !== 0) {
                isHighlighted = edgesPath.some(
                  (edge) =>
                    (edge.source === (link.source.id || link.source) &&
                      edge.target === (link.target.id || link.target)) ||
                    (edge.source === (link.target.id || link.target) &&
                      edge.target === (link.source.id || link.source) &&
                      graphType === "undirected")
                );
                console.log(
                  "Comparing",
                  link.source,
                  "to",
                  edgesPath.map((edge) => edge.source)
                );
                console.log(
                  "Data types:",
                  typeof link.source,
                  "and",
                  typeof edgesPath[0].source
                );
              }

              const bidirectionalEqualWeight = isBidirectionalAndEqualWeight(
                link.source,
                link.target,
                link.weight,
                links
              );

              const curveLink =
                !bidirectionalEqualWeight &&
                isLinkBidirectionalAndShouldCurve(
                  link.source,
                  link.target,
                  links
                );

              if (sourceNode && targetNode) {
                const angle = Math.atan2(
                  targetNode.y - sourceNode.y,
                  targetNode.x - sourceNode.x
                );
                const sourceRadius = 15;
                const targetRadius = 15;
                const sourceX = sourceNode.x + sourceRadius * Math.cos(angle);
                const sourceY = sourceNode.y + sourceRadius * Math.sin(angle);
                const targetX = targetNode.x - targetRadius * Math.cos(angle);
                const targetY = targetNode.y - targetRadius * Math.sin(angle);

                // Determine if the link is more horizontal or vertical to adjust text placement
                const isHorizontal =
                  Math.abs(targetX - sourceX) > Math.abs(targetY - sourceY);
                const textOffsetX = isHorizontal ? 0 : 10; // Offset more for vertical links
                const textOffsetY = isHorizontal ? -10 : 0; // Offset more for horizontal links

                const textX = (sourceX + targetX) / 2 + textOffsetX;
                const textY = (sourceY + targetY) / 2 + textOffsetY;

                const markerId = `arrowhead-${link.source}-${link.target}-${
                  curveLink ? "curve" : "straight"
                }`;

                const pathD = curveLink
                  ? `M ${sourceX},${sourceY} Q ${(sourceX + targetX) / 2},${
                      (sourceY + targetY) / 2 - 150
                    } ${targetX},${targetY}`
                  : `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

                const markerEnd = isGraphDirected ? "url(#arrowhead)" : "";
                const strokeColor = isHighlighted ? "red" : "black"; // Highlighted edges are red
                const strokeWidth = "2"; // Standard stroke width
                const highlightStrokeWidth = "5"; // Wider stroke for highlighting
                const highlightColor = isHighlighted
                  ? "rgba(255, 0, 0, 0.3)"
                  : "transparent";

                return (
                  <g key={index}>
                    <path
                      d={pathD}
                      stroke={highlightColor}
                      strokeWidth={highlightStrokeWidth} // Visual stroke width
                      fill="none"
                      markerEnd="none"
                      // Ensure this is correctly applied
                    />
                    <path
                      d={pathD}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth} // Visual stroke width
                      fill="none"
                      markerEnd={markerEnd}
                      onContextMenu={(e) => showLinkContextMenu(e, link)} // Ensure this is correctly applied
                    />
                    <line
                      key={index}
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="black"
                      markerEnd={markerEnd}
                    />
                    {/* Optionally, for debugging: */}
                    <path
                      d={pathD}
                      //stroke="rgba(255, 0, 0, 0.5)" // Semi-transparent red for visibility
                      strokeWidth="15" // Larger stroke width for debugging interaction area
                      fill="none"
                      pointerEvents="stroke" // Ensure it captures events only on the stroke
                      onContextMenu={(e) => showLinkContextMenu(e, link)} // Duplicate event for testing
                    />
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="8"
                        refY="3.5"
                        orient="auto"
                      >
                        <path d="M0,0 L0,7 L8,3.5 z" fill="black" />
                      </marker>
                      <marker
                        id="arrowtail"
                        markerWidth="10"
                        markerHeight="7"
                        refX="0"
                        refY="3.5"
                        orient="auto-start-reverse"
                      >
                        <path d="M8,0 L8,7 L0,3.5 z" />
                      </marker>
                    </defs>
                    <path
                      d={pathD}
                      stroke="black"
                      strokeWidth="2"
                      fill="none"
                      markerEnd={`url(#${markerId})`}
                      onContextMenu={(e) => showLinkContextMenu(e, link)}
                    />
                    <text
                      x={textX}
                      y={curveLink ? textY - 75 : textY}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fill="black"
                      fontSize="18px"
                      fontWeight="bold"
                      style={{ userSelect: "none", pointerEvents: "none" }}
                    >
                      {displayWeight(link.weight)}
                    </text>
                  </g>
                );
              }
              return null;
            })}

            {/* Draw nodes */}
            {nodes.map((node) => (
              <g key={node.id}>
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={15}
                  fill={
                    DoubleClikedNode1 === node.id
                      ? "darkslateblue"
                      : selectedNode === node.id
                      ? "darkslateblue"
                      : node.color
                  }
                  stroke="black"
                  strokeWidth="1"
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  onDoubleClick={() => hanldeNodeDoubleClickHelper(node.id)}
                  onContextMenu={(e) => showNodeContextMenu(e, node)}
                  onClick={() => {
                    // Use the modified or new handler depending on the mode
                    if (isDijkstraMode) {
                      handleNodeSelectionForDijkstra(node.id);
                    } else if (isShortestPathMode) {
                      handleNodeSelection(node.id);
                    } else if (isBFSMode) {
                      handleNodeSelectionForBFS(node.id);
                    } else if (isDFSMode) {
                      handleNodeSelectionForDFS(node.id);
                    } else if (isRoutingMode) {
                      handleNodeSelectionForRoutingTable(node.id);
                    }
                  }}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dy=".3em"
                  fill="black"
                  fontSize="18px"
                  fontWeight="bold"
                  style={{
                    cursor: "default",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {node.id}
                </text>
              </g>
            ))}
          </svg>
          {contextMenu.visible && (
            <div
              style={{
                position: "fixed",
                left: `${contextMenu.x}px`,
                top: `${contextMenu.y}px`,
                backgroundColor: "#f9f9f9",
                border: "1px solid #ddd",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                borderRadius: "8px",
                padding: "10px",
                zIndex: 1000,
                transition: "opacity 0.2s ease",
                opacity: contextMenu.visible ? 1 : 0,
                fontFamily: "Arial, sans-serif",
                fontSize: "14px",
                userSelect: "none",
              }}
              onMouseLeave={() => hideContextMenu()}
            >
              {contextMenu.node && (
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    color: "black",
                  }}
                >
                  <li
                    style={{
                      padding: "8px",
                      borderRadius: "5px",
                      margin: "5px 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={() => handleDeleteNode()}
                  >
                    Delete Node
                  </li>
                  <li
                    style={{
                      padding: "8px",
                      borderRadius: "5px",
                      margin: "5px 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={() => handleChangeNodeId()}
                  >
                    Change Node ID
                  </li>
                </ul>
              )}
              {contextMenu.link && (
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    color: "black",
                  }}
                >
                  <li
                    style={{
                      padding: "8px",
                      borderRadius: "5px",
                      margin: "5px 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={changeLinkWeight}
                  >
                    Change Link Weight
                  </li>
                  <li
                    style={{
                      padding: "8px",
                      borderRadius: "5px",
                      margin: "5px 0",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#e8e8e8")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "transparent")
                    }
                    onClick={deleteLink}
                  >
                    Delete Link
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default NetworkDiagram;
