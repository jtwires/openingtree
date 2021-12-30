import React from 'react'
import {
    Box,
    Button,
    Link,
    Table,
    TableBody,
    TableRow,
    TableCell,
    TextField,
} from '@material-ui/core'
import {
    DataGrid,
    GridOverlay
} from '@mui/x-data-grid'
import CircularProgress from '@mui/material/CircularProgress'
import {GameState} from '../app/GameState'

class Position {
    constructor(game, ply) {
        this.game = game
        this.ply = ply
    }
}

export default class Search extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            query: '',
            results: [],
            scanning: false,
            scannedGames: 0,
            totalGames: 0,
        }
    }

    updateQuery(event) {
        this.setState({
            query: event.target.value,
        })
    }

    search() {
        this.setState({
            results: [],
            scanning: true,
            scannedGames: 0,
            totalGames: this.props.openingGraph.games.length,
        })
        setTimeout(() => this.scan(this.state.query, 0))
    }

    cancel() {
        this.setState({ scanning: false })
    }

    scan(query, idx) {
        if (!this.state.scanning) {
            return
        }

        let games = this.props.openingGraph.games
        if (idx >= games.length) {
            this.cancel()
            return
        }

        var results = []
        for (var i = 0; idx < games.length && i < 10; i++) {
            let game = games[idx]
            for (var ply = 0; ply < game.moves.length; ply++) {
                let move = game.moves[ply]
                if (this.evaluate(query, move)) {
                    results.push(new Position(game, ply + 1))
                }
            }
            idx++
        }

        if (results.length > 0) {
            this.setState({
                results: [...this.state.results, ...results],
            })
        }
        this.setState({ scannedGames: idx })

        setTimeout(() => this.scan(query, idx))
    }

    evaluate(query, move) {
        if (query === move.move.san) {
            return true
        }
        if (move.sourceFen.startsWith(query)) {
            return true
        }
        return false
    }

    navigate(position) {
        let game = new GameState(
            this.props.openingGraph.variant,
            position.game.moves[0].sourceFen,
            position.game.headers,
        )
        position.game.moves.forEach((move) => game.makeMove(move.move))
        game.navigateToMove(position.ply)
        this.props.navigateToGame(game)
    }

    render() {
        return <>
            {this.queryTable()}
            {this.resultsGrid()}
        </>
    }

    queryTable() {
        return (
            <Table size='small'>
                <TableBody>
                    { this.queryInput() }
                    { this.queryButton() }
                </TableBody>
            </Table>
        )
    }

    queryInput() {
        return (
            <TableRow>
                <TableCell style={{borderBottom: 'none'}}>
                    <TextField
                        id='searchTextBox'
                        className='searchField'
                        name='search'
                        label='search query'
                        margin='dense'
                        variant='outlined'
                        fullWidth
                        onChange={this.updateQuery.bind(this)}
                        inputProps={{
                            style: {fontSize: 12},
                            spellCheck: false,
                        }}
                    />
                </TableCell>
            </TableRow>
        )
    }

    queryButton() {
        return (
            <TableRow>
                <TableCell align='right' style={{borderBottom: 'none'}}>
                    { this.cancelButton() }
                    <Button
                        size='small'
                        color='primary'
                        onClick={this.search.bind(this)}
                        disabled={this.state.scanning}
                    >
                        Search
                    </Button>
                </TableCell>
            </TableRow>
        )
    }

    cancelButton() {
        if (!this.state.scanning) {
            return ''
        }
        return (
            <Button
                size='small'
                color='primary'
                onClick={this.cancel.bind(this)}
            >
                Cancel
            </Button>
        )
    }

    resultsGrid() {
        const mkTitle = (position) => {
            let headers = position.game.headers
            return `${headers.White} ${headers.Black} (${headers.Date})`
        }
        const columns = [
            {
                field: 'position',
                headerName: 'Game',
                flex: 1,
                renderCell: (params) => (
                    <Link
                        href="#"
                        onClick={() => this.navigate(params.value)}>
                        {mkTitle(params.value)}
                    </Link>
                ),
                // XXX valueFormatter for export
            },
        ]
        let rows = this.state.results.map((position, idx) => {
            return { id: idx, position: position }
        })
        let message = this.state.scanning ? 'searching...' : 'no matches'
        let progress = this.state.totalGames > 0
            ? 100 * this.state.scannedGames / this.state.totalGames
            : 0
        return (
            // FIXME
            <div style={{ height: '400px' }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pagination
                    autoPageSize
                    disableSelectionOnClick
                    loading={this.state.scanning}
                    components={{
                        NoRowsOverlay: () => (
                            <GridOverlay>
                                <Box>{message}</Box>
                            </GridOverlay>
                        ),
                        LoadingOverlay: () => (
                            <GridOverlay>
                                <CircularProgress variant='determinate' value={progress} />
                            </GridOverlay>
                        ),
                    }}
                />
            </div>
        )
    }
}
