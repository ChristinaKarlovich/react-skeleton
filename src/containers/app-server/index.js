import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import {Route, Switch} from 'react-router-dom';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import * as actions from '@store/actions';
import Modals from '../modals';
import routes from '../../routes';
import {objectUtils} from '../../utils';

import '../../theme/style.less';

class App extends Component {

  static propTypes = {
    session: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  // componentDidMount() {
  //   this.props.dispatch(actions.session.remind());
  // }

  render() {
    // If checking token
    // if (this.props.session.wait) {
    //   return (
    //     <Fragment>
    //       Загрузка...
    //     </Fragment>
    //   );
    // }

    return (
      <Fragment>
        <Helmet>
          <title>App SSR</title>
          <meta name="description" content="This is a proof of concept for React SSR"/>
        </Helmet>
        <Switch>
          {objectUtils.objectToArray(routes).map(route => {
            return (
              <Route key={route.path} path={route.path} exact={route.exact} component={route.component}/>
            );
          })}
        </Switch>
        <Modals/>
      </Fragment>
    );
  }
}

export default connect(state => ({
  session: state.session
}))(App);
