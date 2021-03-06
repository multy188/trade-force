import React, { useRef } from 'react';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { VerticalContainer } from '@react-force/core';
import {
    OrderEntityModel,
    OrderSideLookup,
    OrderStatus,
    OrderStatusLookup,
    OrderType,
    OrderTypeLookup,
    Side,
} from '@trade-force/models';
import {
    CellClassParams,
    GridApi,
    GridReadyEvent,
    RowSelectedEvent,
    NavigateToNextCellParams,
    ValueGetterParams,
} from 'ag-grid-community';
import { AgGridColumn, AgGridReact } from 'ag-grid-react';
import classNames from 'classnames';
import { useUiState, useUiStateSetter } from '../../contexts';
import { useOrders, useSecurities, useUsers } from '../../hooks';
import { PanelHeader } from '../PanelHeader';
import 'ag-grid-enterprise';
import { CellPosition } from 'ag-grid-community/dist/lib/entities/cellPosition';

const useStyles = makeStyles((theme: Theme) => ({
    panelHeader: {
        height: 52,
    },
    grid: {
        height: '100%',
        width: '100%',
    },
    buyLegend: {
        backgroundColor: theme.palette.business.buyLegend,
    },
    sellLegend: {
        backgroundColor: theme.palette.business.sellLegend,
    },
    side: {
        color: theme.palette.text.emphasis,
        fontSize: 16,
        fontWeight: theme.typography.fontWeightBold,
        textTransform: 'uppercase',
    },
    buyText: {
        color: theme.palette.business.buyText,
    },
    sellText: {
        color: theme.palette.business.sellText,
    },
    symbol: {
        color: theme.palette.text.emphasis,
        fontFamily: 'Source Sans Pro',
        fontSize: 16,
        fontWeight: 600,
    },
}));

export const Orders = () => {
    const classes = useStyles();
    const uiState = useUiState();
    const setUiState = useUiStateSetter();

    // use useRef instead of useState to avoid a stale closure
    // see https://stackoverflow.com/questions/64071586/
    const gridApiRef = useRef<GridApi>();

    const {
        isLoading: isOrdersLoading,
        isError: isOrdersError,
        data: orderCollectionModel,
    } = useOrders();
    const {
        isLoading: isSecuritiesLoading,
        isError: isSecuritiesError,
        data: securities,
    } = useSecurities();
    const {
        isLoading: isUsersLoading,
        isError: isUsersError,
        data: users,
    } = useUsers();

    const handleGridReady = (event: GridReadyEvent) => {
        gridApiRef.current = event.api;
    };

    const handleRowSelected = (event: RowSelectedEvent) => {
        if (event.node.isSelected()) {
            setUiState({
                ...uiState,
                isOrderTicketOpen: true,
                targetOrder: event.node.data,
            });
        }
    };

    const handleKeyboardNavigation = (
        params: NavigateToNextCellParams
    ): CellPosition => {
        const gridApi = gridApiRef.current;
        if (gridApi === undefined) {
            throw new Error('This should never happen!');
        }

        let previousCell = params.previousCellPosition;
        const suggestedNextCell = params.nextCellPosition;

        const KEY_UP = 38;
        const KEY_DOWN = 40;
        const KEY_LEFT = 37;
        const KEY_RIGHT = 39;

        switch (params.key) {
            case KEY_DOWN:
                previousCell = params.previousCellPosition;
                // set selected cell on current cell + 1
                gridApi.forEachNode(function (node) {
                    if (previousCell.rowIndex + 1 === node.rowIndex) {
                        node.setSelected(true);
                    }
                });
                return suggestedNextCell;
            case KEY_UP:
                previousCell = params.previousCellPosition;
                // set selected cell on current cell - 1
                gridApi.forEachNode(function (node) {
                    if (previousCell.rowIndex - 1 === node.rowIndex) {
                        node.setSelected(true);
                    }
                });
                return suggestedNextCell;
            case KEY_LEFT:
            case KEY_RIGHT:
                return suggestedNextCell;
            default:
                throw new Error('This should never happen!');
        }
    };

    const sideLegendCellClass = (params: CellClassParams) => {
        return params.data._embedded.side === 'buy'
            ? classes.buyLegend
            : classes.sellLegend;
    };

    const sideCellClass = (params: CellClassParams) => {
        return [
            classes.side,
            params.data._embedded.side === 'buy'
                ? classes.buyText
                : classes.sellText,
        ];
    };

    const sideValueGetter = (params: ValueGetterParams) => {
        return OrderSideLookup[params.data._embedded.side as Side];
    };

    const securityNameValueGetter = (params: ValueGetterParams) => {
        const id = params.data._embedded.secId;
        const security = securities?.find((security) => security.id === id);
        return security !== undefined ? security.name : id;
    };

    const orderTypeValueGetter = (params: ValueGetterParams) => {
        return OrderTypeLookup[params.data._embedded.type as OrderType];
    };

    const orderStatusValueGetter = (params: ValueGetterParams) => {
        return OrderStatusLookup[params.data._embedded.status as OrderStatus];
    };

    const pmValueGetter = (params: ValueGetterParams) => {
        const id = params.data._embedded.managerId;
        const user = users?.find((user) => user.id === id);
        return user !== undefined ? user.initials : id;
    };

    const paValueGetter = (params: ValueGetterParams) => {
        const id = params.data._embedded.analystId;
        const user = users?.find((user) => user.id === id);
        return user !== undefined ? user.initials : id;
    };

    const traderValueGetter = (params: ValueGetterParams) => {
        const id = params.data._embedded.traderId;
        const user = users?.find((user) => user.id === id);
        return user !== undefined ? user.initials : id;
    };

    // Allow ErrorBoundary to handle errors
    if (isOrdersError || isSecuritiesError || isUsersError) {
        throw new Error('Error loading data');
    }

    if (isOrdersLoading || isSecuritiesLoading || isUsersLoading) {
        return null;
    }

    if (
        orderCollectionModel === undefined ||
        securities === undefined ||
        users === undefined
    ) {
        throw new Error('Error loading data');
    }

    const orderEntityModels: Array<OrderEntityModel> = orderCollectionModel.getContent();

    return (
        <VerticalContainer>
            <PanelHeader className={classes.panelHeader}>Orders</PanelHeader>
            <div className={classNames('ag-theme-alpine-dark', classes.grid)}>
                <AgGridReact
                    rowData={orderEntityModels}
                    rowSelection={'single'}
                    defaultColDef={{
                        resizable: true,
                        sortable: true,
                        filter: true,
                    }}
                    gridOptions={{
                        rowHeight: 36,
                        suppressCellSelection: true,
                        navigateToNextCell: handleKeyboardNavigation,
                    }}
                    onGridReady={handleGridReady}
                    onRowSelected={handleRowSelected}
                >
                    <AgGridColumn
                        width={12}
                        minWidth={12}
                        cellClass={sideLegendCellClass}
                        // padding must be set using cellStyle, not cellClass
                        cellStyle={{ padding: 0 }}
                    />
                    <AgGridColumn
                        field="_embedded.side"
                        headerName="Side"
                        width={90}
                        cellClass={sideCellClass}
                        valueGetter={sideValueGetter}
                    />
                    <AgGridColumn
                        field="_embedded.secId"
                        headerName="Symbol"
                        width={100}
                        cellClass={classes.symbol}
                    />
                    <AgGridColumn
                        field="_embedded.secId"
                        headerName="Name"
                        width={300}
                        valueGetter={securityNameValueGetter}
                    />
                    <AgGridColumn
                        field="_embedded.quantity"
                        headerName="Qty"
                        width={90}
                    />
                    <AgGridColumn
                        field="_embedded.executed"
                        headerName="Exec"
                        width={90}
                    />
                    <AgGridColumn
                        field="_embedded.type"
                        headerName="Type"
                        width={100}
                        valueGetter={orderTypeValueGetter}
                    />
                    <AgGridColumn
                        field="_embedded.status"
                        headerName="Status"
                        width={160}
                        valueGetter={orderStatusValueGetter}
                    />
                    <AgGridColumn
                        field="_embedded.fundId"
                        headerName="Fund"
                        width={100}
                    />
                    <AgGridColumn
                        field="_embedded.managerId"
                        headerName="PM"
                        width={80}
                        valueGetter={pmValueGetter}
                    />
                    <AgGridColumn
                        field="_embedded.analystId"
                        headerName="PA"
                        width={80}
                        valueGetter={paValueGetter}
                    />
                    <AgGridColumn
                        field="_embedded.traderId"
                        headerName="TR"
                        width={80}
                        valueGetter={traderValueGetter}
                    />
                </AgGridReact>
            </div>
        </VerticalContainer>
    );
};
