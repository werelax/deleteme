use Graph::Easy;

open FILE, "graph.txt";
$graph_string = join('', <FILE>);
close FILE;

my $graph = Graph::Easy->new($graph_string);
print $graph->as_boxart();

